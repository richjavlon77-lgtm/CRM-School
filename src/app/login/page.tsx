import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default function LoginPage() {
  const cookieStore = cookies()
  const session = cookieStore.get('crm_session')
  
  if (session) {
    redirect('/dashboard')
  }

  return <LoginForm />
}