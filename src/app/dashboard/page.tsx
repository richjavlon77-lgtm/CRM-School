import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default function DashboardPage() {
  const cookieStore = cookies()
  const session = cookieStore.get('crm_session')
  
  if (!session) {
    redirect('/login')
  }

  return <DashboardClient />
}