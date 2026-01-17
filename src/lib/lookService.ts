import type { Look } from './looks'
import { supabase } from './supabase'

export type LookImageKind = 'inspo' | 'me'

export type UploadProgress = {
  percent: number
  label: string
}

export type CreateLookInput = {
  userId: string
  title?: string
  notes?: string
  inspoFile?: File | null
  myFile?: File | null
  onProgress?: (progress: UploadProgress) => void
}

export type LookImageRow = {
  look_id: string
  kind: LookImageKind
  storage_path: string | null
}

export type LookImageUrls = {
  inspoUrl: string | null
  myUrl: string | null
}

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

export function validateImageFile(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'JPG, PNG, or WEBP only.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'Max 10MB.'
  }
  return null
}

export function getAcceptedTypes() {
  return ALLOWED_MIME_TYPES.join(',')
}

function createFileName(kind: LookImageKind, file: File) {
  const extFromName = file.name.split('.').pop()?.toLowerCase()
  const ext = extFromName || MIME_EXTENSION[file.type] || 'jpg'
  const uid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${kind}-${uid}.${ext}`
}

function buildStoragePath(userId: string, lookId: string, kind: LookImageKind, file: File) {
  const fileName = createFileName(kind, file)
  return `${userId}/${lookId}/${kind}/${fileName}`
}

async function uploadLookImage({
  userId,
  lookId,
  kind,
  file
}: {
  userId: string
  lookId: string
  kind: LookImageKind
  file: File
}) {
  const storagePath = buildStoragePath(userId, lookId, kind, file)
  const { error } = await supabase.storage.from('lookbook').upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  })

  if (error) {
    return { error: error.message }
  }

  return { storagePath, error: null }
}

export async function createLookWithImages({
  userId,
  title,
  notes,
  inspoFile,
  myFile,
  onProgress
}: CreateLookInput) {
  const files: Array<{ kind: LookImageKind; file: File }> = []
  if (inspoFile) files.push({ kind: 'inspo', file: inspoFile })
  if (myFile) files.push({ kind: 'me', file: myFile })

  for (const entry of files) {
    const validationError = validateImageFile(entry.file)
    if (validationError) {
      return { error: validationError }
    }
  }

  onProgress?.({ percent: 0, label: 'Making look' })

  const { data: look, error: lookError } = await supabase
    .from('looks')
    .insert({
      user_id: userId,
      title: title || null,
      notes: notes || null
    })
    .select('id')
    .single()

  if (lookError || !look) {
    return { error: lookError?.message ?? 'Could not create look.' }
  }

  const totalBytes = files.reduce((sum, entry) => sum + entry.file.size, 0)
  let uploadedBytes = 0

  for (const entry of files) {
    const label = entry.kind === 'inspo' ? 'Uploading inspo' : 'Uploading my photo'
    onProgress?.({
      percent: totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : 0,
      label
    })

    const { storagePath, error: uploadError } = await uploadLookImage({
      userId,
      lookId: look.id,
      kind: entry.kind,
      file: entry.file
    })

    if (uploadError || !storagePath) {
      return { error: uploadError ?? 'Upload failed.' }
    }

    const { error: imageError } = await supabase.from('look_images').insert({
      look_id: look.id,
      kind: entry.kind,
      storage_path: storagePath
    })

    if (imageError) {
      return { error: imageError.message }
    }

    uploadedBytes += entry.file.size
    onProgress?.({
      percent: totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : 100,
      label: 'Upload done'
    })
  }

  if (!files.length) {
    onProgress?.({ percent: 100, label: 'Saved' })
  }

  return { lookId: look.id, error: null }
}

export async function fetchLookWithImages(
  lookId: string
): Promise<{ look: Look | null; images: LookImageUrls; error: string | null }> {
  const { data: look, error: lookError } = await supabase
    .from('looks')
    .select('id, title, notes, created_at')
    .eq('id', lookId)
    .single()

  if (lookError || !look) {
    return { error: lookError?.message ?? 'Not found.', look: null, images: { inspoUrl: null, myUrl: null } }
  }

  const { data: imageRows } = await supabase
    .from('look_images')
    .select('look_id, kind, storage_path')
    .eq('look_id', lookId)

  const paths = imageRows?.map((row) => row.storage_path).filter(Boolean) as string[] | undefined
  const signedMap = new Map<string, string>()

  if (paths?.length) {
    const { data: signedData } = await supabase.storage.from('lookbook').createSignedUrls(paths, 60 * 60)
    signedData?.forEach((item) => {
      if (item?.signedUrl && item.path) {
        signedMap.set(item.path, item.signedUrl)
      }
    })
  }

  let inspoUrl: string | null = null
  let myUrl: string | null = null

  imageRows?.forEach((row) => {
    if (!row.storage_path) return
    const url = signedMap.get(row.storage_path) ?? null
    if (row.kind === 'inspo' && !inspoUrl) inspoUrl = url
    if (row.kind === 'me' && !myUrl) myUrl = url
  })

  return { look, images: { inspoUrl, myUrl }, error: null }
}

export async function updateLook(
  lookId: string,
  values: {
    title: string
    notes: string
  }
) {
  const { error } = await supabase
    .from('looks')
    .update({
      title: values.title || null,
      notes: values.notes || null
    })
    .eq('id', lookId)

  return { error: error?.message ?? null }
}

export async function deleteLookWithAssets(lookId: string) {
  const { data: imageRows, error: imageError } = await supabase
    .from('look_images')
    .select('storage_path')
    .eq('look_id', lookId)

  if (imageError) {
    return { error: imageError.message }
  }

  const paths = imageRows?.map((row) => row.storage_path).filter(Boolean) as string[] | undefined
  if (paths?.length) {
    const { error: removeError } = await supabase.storage.from('lookbook').remove(paths)
    if (removeError) {
      return { error: removeError.message }
    }
  }

  const { error: deleteError } = await supabase.from('looks').delete().eq('id', lookId)
  if (deleteError) {
    return { error: deleteError.message }
  }

  return { error: null }
}

export { MAX_FILE_BYTES }

export async function upsertLookImage(params: {
  userId: string
  lookId: string
  kind: 'inspo' | 'me'
  file: File
}) {
  const validationError = validateImageFile(params.file)
  if (validationError) return { error: validationError as string }

  const ext = params.file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${crypto.randomUUID()}.${ext}`
  const path = `${params.userId}/${params.lookId}/${params.kind}/${filename}`

  // 1) subir a storage
  const { error: uploadError } = await supabase.storage
    .from('lookbook')
    .upload(path, params.file, { upsert: false, contentType: params.file.type })

  if (uploadError) return { error: uploadError.message }

  // 2) upsert en look_images (requiere unique index look_id+kind)
  const { error: upsertError } = await supabase
    .from('look_images')
    .upsert(
      { look_id: params.lookId, kind: params.kind, storage_path: path },
      { onConflict: 'look_id,kind' }
    )

  if (upsertError) return { error: upsertError.message }

  // 3) signed url para refrescar UI
  const { data: signed, error: signedError } = await supabase.storage
    .from('lookbook')
    .createSignedUrl(path, 60 * 60)

  if (signedError) return { error: signedError.message }

  return { signedUrl: signed.signedUrl, storagePath: path, error: null as string | null }
}
