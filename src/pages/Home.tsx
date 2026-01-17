import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useSession } from '../lib/auth'
import type { Look } from '../lib/looks'
import { supabase } from '../lib/supabase'

type LookCard = Look & {
  meUrl: string | null
  inspoUrl: string | null
}


export default function Home() {
  const navigate = useNavigate()
  const { user } = useSession()
  const [looks, setLooks] = useState<LookCard[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const skeletons = Array.from({ length: 6 }, (_, index) => index)

  useEffect(() => {
    if (!user) {
      setLooks([])
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)

    const fetchLooks = async () => {
      const { data: lookRows, error: lookError } = await supabase
        .from('looks')
        .select('id, title, notes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!mounted) return

      if (lookError || !lookRows) {
        setLooks([])
        setLoading(false)
        return
      }

      if (lookRows.length === 0) {
        setLooks([])
        setLoading(false)
        return
      }

      const lookIds = lookRows.map((look) => look.id)
 const { data: imageRows } = await supabase
  .from('look_images')
  .select('look_id, kind, storage_path')
  .in('look_id', lookIds)


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

const byLook: Record<
  string,
  { meUrl: string | null; inspoUrl: string | null }
> = {}

imageRows?.forEach((row) => {
  if (!row.storage_path) return
  const url = signedMap.get(row.storage_path)
  if (!url) return

  if (!byLook[row.look_id]) {
    byLook[row.look_id] = { meUrl: null, inspoUrl: null }
  }

  if (row.kind === 'me') byLook[row.look_id].meUrl = url
  if (row.kind === 'inspo') byLook[row.look_id].inspoUrl = url
})

setLooks(
  lookRows.map((look) => ({
    ...look,
    meUrl: byLook[look.id]?.meUrl ?? null,
    inspoUrl: byLook[look.id]?.inspoUrl ?? null
  }))
)

      setLoading(false)
    }

    void fetchLooks()

    return () => {
      mounted = false
    }
  }, [user])

  const filteredLooks = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return looks
    return looks.filter((look) => {
      const haystack = `${look.title ?? ''} ${look.notes ?? ''}`.toLowerCase()
      return haystack.includes(trimmed)
    })
  }, [looks, query])

  const showSkeleton = loading
  const showEmpty = !loading && looks.length === 0
  const showNoResults = !loading && looks.length > 0 && filteredLooks.length === 0

  return (
    <div className="space-y-12">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <p className="type-eyebrow">Archive</p>
          <h2 className="type-title text-4xl md:text-5xl">Soft looks, slow days.</h2>
        </div>
        <div className="w-full max-w-xs space-y-2 sm:w-auto">
          <label className="ui-label" htmlFor="look-search">
            Find
          </label>
          <input
            id="look-search"
            className="ui-input"
            placeholder="Search title or notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="type-eyebrow">Looks</p>
          <Button onClick={() => navigate('/new')}>New look</Button>
        </div>

        {showEmpty ? (
          <Card className="p-10">
            <div className="space-y-4 text-center">
              <p className="type-eyebrow">Still quiet</p>
              <p className="type-body text-ink/70">Start with one look.</p>
              <Button onClick={() => navigate('/new')}>Create first look</Button>
            </div>
          </Card>
        ) : null}

        {showNoResults ? (
          <Card className="p-10">
            <div className="space-y-3 text-center">
              <p className="type-eyebrow">No matches</p>
              <p className="type-body text-ink/70">Try a different word.</p>
            </div>
          </Card>
        ) : null}

        {!showEmpty && !showNoResults ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {showSkeleton
              ? skeletons.map((index) => (
                  <Card key={index} className="overflow-hidden p-0">
                    <div className="animate-pulse">
                      <div className="aspect-[4/5] bg-line/60" />
                      <div className="space-y-2 p-4">
                        <div className="h-3 w-3/4 rounded-full bg-line/50" />
                        <div className="h-3 w-1/2 rounded-full bg-line/40" />
                      </div>
                    </div>
                  </Card>
                ))
              : filteredLooks.map((look) => (
                  <Link key={look.id} to={`/look/${look.id}`} className="group">
                    <Card className="overflow-hidden p-0">
 <div className="aspect-[4/5] overflow-hidden bg-canvas">
  {look.meUrl ? (
    look.inspoUrl ? (
      <div className="flex h-full">
        {/* Inspiration – 40% */}
        <div className="relative w-[40%] overflow-hidden">
          <img
            src={look.inspoUrl}
            alt="Inspiration"
            className="h-full w-full object-cover opacity-90"
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-line/60" />

        {/* My look – 60% */}
        <div className="relative w-[60%] overflow-hidden">
          <img
            src={look.meUrl}
            alt={look.title || 'My look'}
            className="h-full w-full object-cover transition duration-150 group-hover:scale-[1.01]"
          />
        </div>
      </div>
    ) : (
      <img
        src={look.meUrl}
        alt={look.title || 'Look image'}
        className="h-full w-full object-cover transition duration-150 group-hover:scale-[1.01]"
      />
    )
  ) : (
    <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-muted">
      No image yet
    </div>
  )}
</div>

                      <div className="space-y-1 p-4">
                        <p className="text-sm font-medium text-ink">{look.title || 'Untitled'}</p>
                        <p className="text-xs text-muted">
                          {new Date(look.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
