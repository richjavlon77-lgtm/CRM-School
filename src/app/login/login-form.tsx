'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (res.ok) {
        const data = await res.json()
        document.cookie = `crm_session=${data.token}; path=/; max-age=${60*60*24*7}`
        router.push('/dashboard')
      } else {
        setError(true)
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
            type="text"
            className="input"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(false); }}
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
        
        {error && <p className="login-error">Неверное имя пользователя или пароль</p>}
      </div>
    </div>
  )
}