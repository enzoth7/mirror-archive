import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { session, signIn, signUp, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/'
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!loading && session) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)

    if (mode === 'login') {
      const { error: signInError } = await signIn(email, password)
      setError(signInError)
    } else {
      const { error: signUpError } = await signUp(email, password)
      if (!signUpError) {
        setNotice('Check your inbox to confirm.')
      }
      setError(signUpError)
    }

    setSubmitting(false)
  }

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-3">
          <p className="type-eyebrow">Entry</p>
          <h2 className="type-title text-3xl">Your lookbook</h2>
          <p className="type-body text-ink/70">Sign in or start a small archive.</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant={mode === 'login' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('login')}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === 'register' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('register')}
          >
            Sign up
          </Button>
        </div>
        <form className="mt-6 grid gap-5" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {notice ? <p className="type-caption text-accent">{notice}</p> : null}
          {error ? <p className="type-caption text-accent">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'One moment' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
