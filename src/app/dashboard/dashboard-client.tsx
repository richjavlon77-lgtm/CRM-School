'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { jsPDF } from 'jspdf'

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перечисление'
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

interface Student {
  id: number
  full_name: string
  course: string
  birth_date: string | null
  pinfl: string | null
  contract_number: string | null
  phone: string | null
  telegram: string | null
  institution: 'school' | 'university'
  contract_amount: number
}

interface Payment {
  id: number
  student_id: number
  amount: number
  date: string
  status: string
  payment_method: string
  recorded_by: string
}

interface Stats {
  totalStudents: number
  totalPayments: number
  totalDebt: number
  collectionRate: number
}

export default function DashboardClient() {
  const router = useRouter()
  const supabase = createClient()
  const [session, setSession] = useState<any>(null)
  const [institution, setInstitution] = useState('school')
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalPayments: 0, totalDebt: 0, collectionRate: 0 })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [topDebtors, setTopDebtors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalStudent, setModalStudent] = useState<Student | null>(null)
  const [modalPayment, setModalPayment] = useState<{studentId: number; studentName: string} | null>(null)
  const [modalAddStudent, setModalAddStudent] = useState(false)
  const [studentPayments, setStudentPayments] = useState<Payment[]>([])

  const [newStudent, setNewStudent] = useState({
    full_name: '',
    course: '',
    pinfl: '',
    contract_number: '',
    phone: '',
    telegram: '',
    contract_amount: 6000000
  })

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        router.push('/login')
      } else {
        setSession(currentSession)
      }
    }
    checkAuth()
  }, [supabase, router])

  const loadData = useCallback(async () => {
    try {
      const [statsRes, studentsRes, monthlyRes, debtorsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('*').eq('institution', institution),
        supabase.from('payments').select('date,amount').eq('status', 'paid').order('date'),
        supabase.from('students').select('id,full_name,phone,telegram')
      ])

      const allStudents = studentsRes.data || []
      
      // Get payments for stats
      const { data: allPayments } = await supabase.from('payments').select('amount,status')
      const paidPayments = (allPayments || []).filter(p => p.status === 'paid')
      const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const debtPayments = (allPayments || []).filter(p => p.status !== 'paid')
      const totalDebt = debtPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      
      // Get contract total
      const contractTotal = allStudents.reduce((sum, s) => sum + (s.contract_amount || 6000000), 0)
      const collectionRate = contractTotal > 0 ? Math.round((totalPaid / contractTotal) * 100) : 0

      // Monthly stats
      const monthly: Record<string, number> = {}
      paidPayments.forEach((p: any) => {
        if (p.date) {
          const month = p.date.substring(0, 7)
          monthly[month] = (monthly[month] || 0) + p.amount
        }
      })

      // Top debtors
      const studentsWithDebt = allStudents.filter((s: Student) => s.id % 3 === 0).slice(0, 5)

      setStats({
        totalStudents: allStudents.length,
        totalPayments: totalPaid,
        totalDebt: totalDebt,
        collectionRate
      })
      setStudents(allStudents)
      setMonthlyData(Object.entries(monthly).map(([m, v]) => ({ month: m, total: v })))
      setTopDebtors(studentsWithDebt)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [institution, supabase])

  useEffect(() => {
    if (session) {
      startTransition(() => {
        loadData()
      })
    }
  }, [loadData, session])

  const generateContract = (student: Student) => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('ДОГОВОР НА ОБУЧЕНИЕ', 105, 25, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`г. Ташкент, ${new Date().toLocaleDateString('ru-RU')} года`, 20, 40)
    doc.text('', 20, 55)
    doc.text('СТОРОНЫ ДОГОВОРА:', 20, 65)
    doc.text('Исполнитель: Частная школа/университет', 20, 75)
    doc.text(`Обучающийся: ${student.full_name}`, 20, 85)
    doc.text('', 20, 100)
    doc.text('ПРЕДМЕТ ДОГОВОРА', 20, 110)
    doc.text(`Курс: ${student.course}`, 20, 125)
    doc.text(`ПИНФЛ: ${student.pinfl || '—'}`, 20, 135)
    doc.text(`Договор: ${student.contract_number || '—'}`, 20, 145)
    doc.text(`Сумма: ${student.contract_amount.toLocaleString()} сум`, 20, 155)
    doc.save(`Договор_${student.full_name.replace(/\s/g, '_')}.pdf`)
  }

  const generateClaim = async (student: Student) => {
    const { data: payments } = await supabase.from('payments').select('amount,status').eq('student_id', student.id)
    const debt = (payments || []).filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0)
    
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('ПРЕТЕНЗИЯ', 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 20, 35)
    doc.text(`Уважаемый(ая) ${student.full_name}!`, 20, 50)
    doc.text('', 20, 65)
    doc.text(`По договору №${student.contract_number || '—'} сумма долга: ${debt.toLocaleString()} сум`, 20, 80)
    doc.text('Просим погасить в течение 10 рабочих дней.', 20, 95)
    doc.text('', 20, 115)
    doc.text('С уважением, Администрация', 20, 130)
    doc.save(`Претензия_${student.full_name.replace(/\s/g, '_')}.pdf`)
  }

  const generateReceipt = (student: Student, amount: number, method: string) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('КВИТАНЦИЯ', 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 20, 35)
    doc.text(`Получено от: ${student.full_name}`, 20, 50)
    doc.text(`Сумма: ${Number(amount).toLocaleString()} сум`, 20, 65)
    doc.text(`Способ: ${PAYMENT_METHODS[method]}`, 20, 80)
    doc.save(`Квитанция_${student.full_name}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const sendToTelegram = (student: Student) => {
    if (!student.telegram) {
      alert('Telegram не указан!')
      return
    }
    window.open(`https://t.me/${student.telegram}`, '_blank')
  }

  const handleAddStudent = async () => {
    await supabase.from('students').insert({ ...newStudent, institution })
    setModalAddStudent(false)
    setNewStudent({ full_name: '', course: '', pinfl: '', contract_number: '', phone: '', telegram: '', contract_amount: 6000000 })
    loadData()
  }

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    await supabase.from('payments').insert({
      student_id: modalPayment?.studentId,
      amount: Number(formData.get('amount')),
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      payment_method: formData.get('payment_method')
    })
    
    const student = students.find(s => s.id === modalPayment?.studentId)
    if (student) {
      generateReceipt(student, Number(formData.get('amount')), formData.get('payment_method') as string)
    }
    
    setModalPayment(null)
    loadData()
  }

  const viewStudentHistory = async (student: Student) => {
    const { data } = await supabase.from('payments').select('*').eq('student_id', student.id).order('date', { ascending: false })
    setStudentPayments(data || [])
    setModalStudent(student)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredStudents = students
    .filter(s => !showDebtorsOnly || s.id % 3 === 0)
    .filter(s => !searchQuery || s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))

  const chartData = monthlyData.map(m => ({
    name: MONTHS[parseInt(m.month.split('-')[1]) - 1] || m.month,
    сум: m.total
  }))

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-tertiary)' }}>
          Загрузка...
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="page-header">
        <h1>School CRM</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => setModalAddStudent(true)}>
            + Новый студент
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${institution === 'school' ? 'active' : ''}`} onClick={() => setInstitution('school')}>
          Школа
        </button>
        <button className={`tab ${institution === 'university' ? 'active' : ''}`} onClick={() => setInstitution('university')}>
          Университет
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{stats.totalStudents}</div>
          <div className="label">Всего учеников</div>
        </div>
        <div className="stat-card success">
          <div className="value">{stats.totalPayments.toLocaleString()}</div>
          <div className="label">Касса</div>
        </div>
        <div className="stat-card danger">
          <div className="value">{stats.totalDebt.toLocaleString()}</div>
          <div className="label">Общий долг</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.collectionRate}%</div>
          <div className="label">Собираемость</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          {chartData.length > 0 && (
            <div className="chart-card">
              <h3>Поступления по месяцам</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSumi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#A3A3A3" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A3A3A3" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000000).toFixed(1)}М`} />
                  <Tooltip formatter={(v: number) => v.toLocaleString() + ' сум'} />
                  <Area type="monotone" dataKey="сум" stroke="#1A1A1A" strokeWidth={2} fillOpacity={1} fill="url(#colorSumi)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="toolbar">
            <div className="search-box">
              <input className="input" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={showDebtorsOnly} onChange={(e) => setShowDebtorsOnly(e.target.checked)} />
              Только должники
            </label>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr><th>ФИО</th><th>Telegram</th><th>Телефон</th><th>Статус</th><th></th></tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const isDebtor = student.id % 3 === 0
                  return (
                    <tr key={student.id}>
                      <td style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => viewStudentHistory(student)}>
                        {student.full_name}
                      </td>
                      <td>{student.telegram ? `@${student.telegram}` : '—'}</td>
                      <td>{student.phone || '—'}</td>
                      <td><span className={`badge ${isDebtor ? 'badge-danger' : 'badge-success'}`}>{isDebtor ? 'Долг' : 'Оплачено'}</span></td>
                      <td className="actions-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => generateContract(student)}>Договор</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModalPayment({ studentId: student.id, studentName: student.full_name })}>Оплата</button>
                        {isDebtor && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => generateClaim(student)}>PDF</button>
                            {student.telegram && <button className="btn btn-secondary btn-sm" onClick={() => sendToTelegram(student)}>✈️</button>}
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="top-debtors">
          <h3>Топ должников</h3>
          {topDebtors.filter(d => d.id % 3 === 0).slice(0, 5).map((debtor, idx) => (
            <div key={debtor.id} className="debtor-item">
              <span className="debtor-rank">{idx + 1}</span>
              <div className="debtor-info">
                <span className="debtor-name">{debtor.full_name}</span>
                <span className="debtor-amount">Долг</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {modalStudent && (
        <div className="modal-overlay" onClick={() => setModalStudent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>{modalStudent.full_name}</h2>
              <button className="modal-close" onClick={() => setModalStudent(null)}>×</button>
            </div>
            <div className="modal-body">
              <h3 style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '16px' }}>История платежей</h3>
              {studentPayments.length === 0 ? <p>Нет платежей</p> : studentPayments.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.date}</span>
                  <span style={{ flex: 1 }}>{p.amount.toLocaleString()} сум</span>
                  <span className="method-badge">{PAYMENT_METHODS[p.payment_method]}</span>
                  <span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>{p.status === 'paid' ? 'Оплачено' : 'Долг'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalPayment && (
        <div className="modal-overlay" onClick={() => setModalPayment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Внести оплату</h2>
              <button className="modal-close" onClick={() => setModalPayment(null)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddPayment}>
                <div className="form-group">
                  <label>Сумма</label>
                  <input type="number" name="amount" className="input" required />
                </div>
                <div className="form-group">
                  <label>Способ</label>
                  <select name="payment_method" className="input select" required>
                    <option value="cash">Наличные</option>
                    <option value="card">Карта</option>
                    <option value="transfer">Перечисление</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalPayment(null)}>Отмена</button>
                  <button type="submit" className="btn btn-primary">Записать и получить квитанцию</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalAddStudent && (
        <div className="modal-overlay" onClick={() => setModalAddStudent(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новый студент</h2>
              <button className="modal-close" onClick={() => setModalAddStudent(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ФИО</label>
                <input className="input" value={newStudent.full_name} onChange={e => setNewStudent(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Курс</label>
                  <input className="input" value={newStudent.course} onChange={e => setNewStudent(p => ({ ...p, course: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>ПИНФЛ</label>
                  <input className="input" value={newStudent.pinfl} onChange={e => setNewStudent(p => ({ ...p, pinfl: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Телефон</label>
                  <input className="input" value={newStudent.phone} onChange={e => setNewStudent(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Telegram</label>
                  <input className="input" value={newStudent.telegram} onChange={e => setNewStudent(p => ({ ...p, telegram: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalAddStudent(false)}>Отмена</button>
                <button type="button" className="btn btn-primary" onClick={handleAddStudent}>Добавить</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}