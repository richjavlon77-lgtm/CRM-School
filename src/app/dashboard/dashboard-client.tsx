'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  const [institution, setInstitution] = useState('school')
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalPayments: 0, totalDebt: 0, collectionRate: 0 })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [topDebtors, setTopDebtors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  
  // Filters
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals
  const [modalStudent, setModalStudent] = useState<Student | null>(null)
  const [modalPayment, setModalPayment] = useState<{studentId: number; studentName: string} | null>(null)
  const [modalAddStudent, setModalAddStudent] = useState(false)
  const [studentPayments, setStudentPayments] = useState<Payment[]>([])

  // New student form
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    course: '',
    pinfl: '',
    contract_number: '',
    phone: '',
    telegram: '',
    contract_amount: 6000000
  })

  const loadData = useCallback(async () => {
    try {
      const [statsRes, studentsRes, monthlyRes, debtorsRes] = await Promise.all([
        fetch(`/api/stats?institution=${institution}`),
        fetch(`/api/students?institution=${institution}`),
        fetch(`/api/monthly?institution=${institution}`),
        fetch(`/api/top-debtors?institution=${institution}`)
      ])
      
      const statsData = await statsRes.json()
      const studentsData = await studentsRes.json()
      const monthly = await monthlyRes.json()
      const debtors = await debtorsRes.json()
      
      setStats(statsData)
      setStudents(studentsData)
      setMonthlyData(monthly)
      setTopDebtors(debtors)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [institution])

  useEffect(() => {
    startTransition(() => {
      loadData()
    })
  }, [loadData])

  // PDF Generation - Contract
  const generateContract = (student: Student) => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('ДОГОВОР НА ОБУЧЕНИЕ', 105, 25, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`г. Ташкент, ${new Date().toLocaleDateString('ru-RU')} года`, 20, 40)
    
    doc.text('', 20, 55)
    doc.setFontSize(11)
    doc.text('СТОРОНЫ ДОГОВОРА:', 20, 65)
    doc.text('Исполнитель: Частная школа/университет', 20, 75)
    doc.text(`Обучающийся: ${student.full_name}`, 20, 85)
    
    doc.text('', 20, 100)
    doc.text('1. ПРЕДМЕТ ДОГОВОРА', 20, 110)
    doc.text('1.1. Исполнитель обязуется предоставить образовательные услуги по', 20, 120)
    doc.text(`программе "${student.course}", а Обучающийся - своевременно оплачивать`, 20, 128)
    doc.text('стоимость обучения.', 20, 136)
    
    doc.text('', 20, 150)
    doc.text('2. ДАННЫЕ ОБУЧАЮЩЕГОСЯ:', 20, 160)
    doc.text(`ПИНФЛ: ${student.pinfl || '—'}`, 20, 170)
    doc.text(`Номер договора: ${student.contract_number || '—'}`, 20, 180)
    doc.text(`Контактный телефон: ${student.phone || '—'}`, 20, 190)
    if (student.telegram) doc.text(`Telegram: @${student.telegram}`, 20, 200)
    
    doc.text('', 20, 215)
    doc.text('3. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ:', 20, 225)
    doc.text(`Сумма договора: ${student.contract_amount.toLocaleString()} сум`, 20, 235)
    doc.text('Оплата производится ежемесячно до 25 числа текущего месяца.', 20, 245)
    
    doc.text('', 20, 265)
    doc.text('4. ПОДПИСИ СТОРОН:', 20, 275)
    doc.text('Исполнитель: _____________________', 20, 290)
    doc.text('Обучающийся: _____________________', 110, 290)
    
    doc.save(`Договор_${student.full_name.replace(/\s/g, '_')}.pdf`)
  }

  // PDF Generation - Claim (Претензия)
  const generateClaim = async (student: Student) => {
    // Calculate debt
    const paymentsRes = await fetch(`/api/payments/${student.id}`)
    const payments: Payment[] = await paymentsRes.json()
    const debt = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0)
    
    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ПРЕТЕНЗИЯ', 105, 25, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')} года`, 20, 40)
    
    doc.text('', 20, 55)
    doc.text(`Уважаемый(ая) ${student.full_name}!`, 20, 65)
    
    doc.text('', 20, 80)
    doc.text('Настоящим уведомляем Вас о наличии задолженности по оплате за обучение.', 20, 90)
    doc.text('', 20, 100)
    doc.text(`По договору №${student.contract_number || '—'} от 2024 года сумма задолженности`, 20, 110)
    doc.text(`составляет: ${debt.toLocaleString()} сум (${debt / 1000000} млн)`, 20, 120)
    
    doc.text('', 20, 140)
    doc.text('В соответствии с условиями договора, просим погасить задолженность в течение', 20, 150)
    doc.text('10 (десяти) рабочих дней с момента получения данного уведомления.', 20, 160)
    
    doc.text('', 20, 180)
    doc.text('В противном случае мы будем вынуждены обратиться в суд для взыскания', 20, 190)
    doc.text('задолженности в принудительном порядке с возмещением судебных расходов.', 20, 200)
    
    doc.text('', 20, 225)
    doc.text('С уважением,', 20, 235)
    doc.text('Администрация Частной школы/университета', 20, 245)
    
    doc.save(`Претензия_${student.full_name.replace(/\s/g, '_')}.pdf`)
  }

  // PDF Generation - Receipt (Квитанция)
  const generateReceipt = (student: Student, amount: number, method: string) => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('КВИТАНЦИЯ №____', 105, 25, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')} года`, 20, 40)
    
    doc.text('', 20, 55)
    doc.text('Получено от:', 20, 65)
    doc.setFont('helvetica', 'bold')
    doc.text(student.full_name, 20, 75)
    
    doc.setFont('helvetica', 'normal')
    doc.text('', 20, 90)
    doc.text('Сумма:', 20, 100)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${Number(amount).toLocaleString()} сум`, 20, 112)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('', 20, 130)
    doc.text(`Способ оплаты: ${PAYMENT_METHODS[method] || method}`, 20, 140)
    doc.text(`Договор: ${student.contract_number || '—'}`, 20, 150)
    
    doc.text('', 20, 175)
    doc.text('Получено:', 20, 185)
    doc.text('____________________________    ____________________________', 20, 200)
    doc.text('Подпись кассира                    Подпись получателя', 20, 210)
    
    doc.save(`Квитанция_${student.full_name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Telegram Bridge
  const sendToTelegram = (student: Student) => {
    if (!student.telegram) {
      alert('Telegram username не указан!')
      return
    }
    const text = `Уважаемый(ая) ${student.full_name}! По договору №${student.contract_number || '—'} у вас задолженность. Подробности в приложенном PDF файле.`
    window.open(`https://t.me/${student.telegram}?text=${encodeURIComponent(text)}`, '_blank')
  }

  // Add Student
  const handleAddStudent = async () => {
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newStudent, institution })
    })
    setModalAddStudent(false)
    setNewStudent({ full_name: '', course: '', pinfl: '', contract_number: '', phone: '', telegram: '', contract_amount: 6000000 })
    loadData()
  }

  // Add Payment
  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: modalPayment?.studentId,
        amount: Number(formData.get('amount')),
        payment_method: formData.get('payment_method'),
        status: 'paid'
      })
    })
    
    // Generate receipt
    const student = students.find(s => s.id === modalPayment?.studentId)
    if (student) {
      generateReceipt(student, Number(formData.get('amount')), formData.get('payment_method') as string)
    }
    
    setModalPayment(null)
    loadData()
  }

  // View Student History
  const viewStudentHistory = async (student: Student) => {
    const res = await fetch(`/api/payments/${student.id}`)
    const data = await res.json()
    setStudentPayments(data)
    setModalStudent(student)
  }

  // Logout
  const handleLogout = () => {
    document.cookie = 'crm_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/login')
  }

  // Filter students
  const filteredStudents = students
    .filter(s => !showDebtorsOnly || s.id % 3 === 0)
    .filter(s => !searchQuery || s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.pinfl && s.pinfl.includes(searchQuery)))

  // Chart data
  const chartData = monthlyData.map(m => ({
    name: MONTHS[parseInt(m.month.split('-')[1]) - 1] || m.month,
    сум: m.total
  }))

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-tertiary)' }}>
          Загрузка данных...
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Header */}
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

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${institution === 'school' ? 'active' : ''}`}
          onClick={() => setInstitution('school')}
        >
          Школа
        </button>
        <button 
          className={`tab ${institution === 'university' ? 'active' : ''}`}
          onClick={() => setInstitution('university')}
        >
          Университет
        </button>
      </div>

      {/* Stats Grid */}
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

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        <div>
          {/* Chart */}
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
                  <XAxis 
                    dataKey="name" 
                    stroke="#A3A3A3" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#A3A3A3" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${(v/1000000).toFixed(1)}М`}
                  />
                  <Tooltip 
                    formatter={(v: number) => v.toLocaleString() + ' сум'}
                    contentStyle={{ 
                      background: '#FFFFFF', 
                      border: '1px solid #E5E5E5', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="сум" 
                    stroke="#1A1A1A" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSumi)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-box">
              <input 
                className="input" 
                placeholder="Поиск по ФИО или ПИНФЛ..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={showDebtorsOnly}
                onChange={(e) => setShowDebtorsOnly(e.target.checked)}
              />
              Только должники
            </label>
          </div>

          {/* Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Telegram</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const isDebtor = student.id % 3 === 0
                  return (
                    <tr key={student.id}>
                      <td 
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => viewStudentHistory(student)}
                      >
                        {student.full_name}
                      </td>
                      <td>{student.telegram ? `@${student.telegram}` : '—'}</td>
                      <td>{student.phone || '—'}</td>
                      <td>
                        <span className={`badge ${isDebtor ? 'badge-danger' : 'badge-success'}`}>
                          {isDebtor ? 'Долг' : 'Оплачено'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => generateContract(student)}
                        >
                          Договор
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => setModalPayment({ studentId: student.id, studentName: student.full_name })}
                        >
                          Оплата
                        </button>
                        {isDebtor && (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => generateClaim(student)}
                            >
                              PDF
                            </button>
                            {student.telegram && (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => sendToTelegram(student)}
                              >
                                ✈️
                              </button>
                            )}
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

        {/* Sidebar - Top Debtors */}
        <div className="top-debtors">
          <h3>Топ должников</h3>
          {topDebtors.filter(d => d.debt > 0).slice(0, 5).map((debtor, idx) => (
            <div key={debtor.id} className="debtor-item">
              <span className="debtor-rank">{idx + 1}</span>
              <div className="debtor-info">
                <span className="debtor-name">{debtor.full_name}</span>
                <span className="debtor-amount">{debtor.debt?.toLocaleString() || '0'} сум</span>
              </div>
            </div>
          ))}
          {topDebtors.filter(d => d.debt > 0).length === 0 && (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '12px 0' }}>
              Нет должников
            </p>
          )}
        </div>
      </div>

      {/* Modal - Student History */}
      {modalStudent && (
        <div className="modal-overlay" onClick={() => setModalStudent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>{modalStudent.full_name}</h2>
              <button className="modal-close" onClick={() => setModalStudent(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>ПИНФЛ</p>
                  <p style={{ fontSize: '0.875rem' }}>{modalStudent.pinfl || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Договор</p>
                  <p style={{ fontSize: '0.875rem' }}>{modalStudent.contract_number || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Телефон</p>
                  <p style={{ fontSize: '0.875rem' }}>{modalStudent.phone || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Telegram</p>
                  <p style={{ fontSize: '0.875rem' }}>{modalStudent.telegram ? `@${modalStudent.telegram}` : '—'}</p>
                </div>
              </div>
              
              <h3 style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                История платежей
              </h3>
              
              {studentPayments.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Нет платежей</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {studentPayments.map(payment => (
                    <div 
                      key={payment.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border-light)'
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: '80px' }}>
                        {payment.date}
                      </span>
                      <span style={{ fontSize: '0.875rem', flex: 1 }}>
                        {payment.amount.toLocaleString()} сум
                      </span>
                      <span className="method-badge">
                        {PAYMENT_METHODS[payment.payment_method]}
                      </span>
                      <span className={`badge ${payment.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                        {payment.status === 'paid' ? 'Оплачено' : payment.status === 'overdue' ? 'Просрочено' : 'Ожидание'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Add Payment */}
      {modalPayment && (
        <div className="modal-overlay" onClick={() => setModalPayment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Внести оплату</h2>
              <button className="modal-close" onClick={() => setModalPayment(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                Студент: <strong>{modalPayment.studentName}</strong>
              </p>
              <form onSubmit={handleAddPayment}>
                <div className="form-group">
                  <label>Сумма (сум)</label>
                  <input 
                    type="number" 
                    name="amount" 
                    className="input" 
                    placeholder="Например: 1500000" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Способ оплаты</label>
                  <select name="payment_method" className="input select" required>
                    <option value="cash">Наличные</option>
                    <option value="card">Карта</option>
                    <option value="transfer">Перечисление</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalPayment(null)}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Записать и получить квитанцию
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Add Student */}
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
                <input 
                  className="input" 
                  value={newStudent.full_name}
                  onChange={e => setNewStudent(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Иван Иванов"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Курс</label>
                  <input 
                    className="input" 
                    value={newStudent.course}
                    onChange={e => setNewStudent(p => ({ ...p, course: e.target.value }))}
                    placeholder="1 курс"
                  />
                </div>
                <div className="form-group">
                  <label>ПИНФЛ</label>
                  <input 
                    className="input" 
                    value={newStudent.pinfl}
                    onChange={e => setNewStudent(p => ({ ...p, pinfl: e.target.value }))}
                    placeholder="12345678901234"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Номер договора</label>
                  <input 
                    className="input" 
                    value={newStudent.contract_number}
                    onChange={e => setNewStudent(p => ({ ...p, contract_number: e.target.value }))}
                    placeholder="ДОГ-011"
                  />
                </div>
                <div className="form-group">
                  <label>Сумма договора</label>
                  <input 
                    type="number"
                    className="input" 
                    value={newStudent.contract_amount}
                    onChange={e => setNewStudent(p => ({ ...p, contract_amount: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Телефон</label>
                  <input 
                    className="input" 
                    value={newStudent.phone}
                    onChange={e => setNewStudent(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+998901234567"
                  />
                </div>
                <div className="form-group">
                  <label>Telegram</label>
                  <input 
                    className="input" 
                    value={newStudent.telegram}
                    onChange={e => setNewStudent(p => ({ ...p, telegram: e.target.value }))}
                    placeholder="username"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalAddStudent(false)}>
                  Отмена
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddStudent}>
                  Добавить студента
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}