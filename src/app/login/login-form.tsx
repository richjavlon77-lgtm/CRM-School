'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(true)
      } else if (data.user) {
        // Success - redirect to dashboard
        router.push('/dashboard')
      }
    } catch {
      setError(true)
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>School CRM</h1>
        <p className="subtitle">Введите учетные данные для входа</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(false); }}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Пароль"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            required
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        {error && <p className="login-error">Неверный email или пароль</p>}
      </div>
    </div>
  )
}