// lib/db.ts - SQLite with proper relations
import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'school.db')
export const db = new Database(dbPath)

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    course TEXT NOT NULL,
    birth_date TEXT,
    pinfl TEXT,
    contract_number TEXT UNIQUE,
    phone TEXT,
    telegram TEXT,
    institution TEXT DEFAULT 'school',
    contract_amount REAL DEFAULT 6000000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'paid',
    payment_method TEXT DEFAULT 'cash',
    recorded_by TEXT DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'manager',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution);
  CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
  CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
`)

// Seed default admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
if (!adminExists) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin')
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('manager', 'manager123', 'manager')
}

// Seed students if empty
const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number }
if (studentCount.count === 0) {
  const insertStudent = db.prepare(`
    INSERT INTO students (full_name, course, birth_date, pinfl, contract_number, phone, telegram, institution, contract_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  const students = [
    ['Азиз Каримов', '1 курс', '2005-03-15', '12345678901234', 'ДОГ-001', '+998901234567', 'azizkarimov', 'school', 6000000],
    ['Бекзод Рахимов', '2 курс', '2004-07-22', '22345678901234', 'ДОГ-002', '+998901234568', 'bekzod_rahimov', 'school', 5500000],
    ['Дилшод Ибрагимов', '3 курс', '2003-11-08', '32345678901234', 'ДОГ-003', '+998901234569', 'dilshor_ibragimov', 'university', 5000000],
    ['Жавохир Махмудов', '1 курс', '2005-01-30', '42345678901234', 'ДОГ-004', '+998901234570', null, 'school', 6000000],
    ['Ислом Хайдаров', '4 курс', '2002-05-14', '52345678901234', 'ДОГ-005', '+998901234571', null, 'university', 4500000],
    ['Камрон Ахмедов', '2 курс', '2004-12-25', '62345678901234', 'ДОГ-006', '+998901234572', null, 'school', 5500000],
    ['Мухаммад Саидов', '3 курс', '2003-08-17', '72345678901234', 'ДОГ-007', '+998901234573', null, 'university', 5000000],
    ['Нуриддин Юсупов', '1 курс', '2005-06-02', '82345678901234', 'ДОГ-008', '+998901234574', null, 'school', 6000000],
    ['Одил Назаров', '2 курс', '2004-02-19', '92345678901234', 'ДОГ-009', '+998901234575', null, 'university', 5500000],
    ['Шахрауз Эргашев', '4 курс', '2002-09-11', '02345678901234', 'ДОГ-010', '+998901234576', null, 'university', 4500000],
  ]
  
  for (const s of students) {
    insertStudent.run(...s)
  }

  // Seed payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (student_id, amount, date, status, payment_method)
    VALUES (?, ?, ?, ?, ?)
  `)
  
  const payments = [
    [1, 1500000, '2025-01-15', 'paid', 'card'],
    [1, 1500000, '2025-02-15', 'paid', 'card'],
    [1, 1500000, '2025-03-15', 'paid', 'card'],
    [1, 1500000, '2025-04-15', 'paid', 'card'],
    [2, 1375000, '2025-01-10', 'paid', 'card'],
    [2, 1375000, '2025-02-10', 'paid', 'transfer'],
    [3, 1250000, '2025-01-05', 'paid', 'transfer'],
    [3, 1250000, '2025-02-05', 'overdue', 'cash'],
    [3, 1250000, '2025-03-05', 'overdue', 'cash'],
    [4, 1500000, '2025-03-20', 'paid', 'cash'],
    [5, 1125000, '2025-01-20', 'paid', 'cash'],
    [6, 1375000, '2025-01-25', 'pending', 'cash'],
    [6, 1375000, '2025-02-25', 'overdue', 'cash'],
    [7, 1250000, '2025-03-01', 'paid', 'transfer'],
    [8, 1500000, '2025-03-10', 'pending', 'cash'],
  ]
  
  for (const p of payments) {
    insertPayment.run(...p)
  }
}

// Types
export interface Student {
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
  created_at: string
  updated_at: string
}

export interface Payment {
  id: number
  student_id: number
  amount: number
  date: string
  status: 'pending' | 'paid' | 'overdue'
  payment_method: 'cash' | 'card' | 'transfer'
  recorded_by: string
  created_at: string
}

export interface User {
  id: number
  username: string
  role: 'admin' | 'manager'
}

// Queries
export const getStudents = (institution?: string) => {
  if (institution) {
    return db.prepare('SELECT * FROM students WHERE institution = ? ORDER BY id DESC').all(institution) as Student[]
  }
  return db.prepare('SELECT * FROM students ORDER BY id DESC').all() as Student[]
}

export const getStudent = (id: number) => {
  return db.prepare('SELECT * FROM students WHERE id = ?').get(id) as Student | undefined
}

export const createStudent = (data: Partial<Student>) => {
  const result = db.prepare(`
    INSERT INTO students (full_name, course, birth_date, pinfl, contract_number, phone, telegram, institution, contract_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.full_name,
    data.course,
    data.birth_date || null,
    data.pinfl || null,
    data.contract_number || null,
    data.phone || null,
    data.telegram || null,
    data.institution || 'school',
    data.contract_amount || 6000000
  )
  return result.lastInsertRowid
}

export const updateStudent = (id: number, data: Partial<Student>) => {
  db.prepare(`
    UPDATE students SET 
      full_name = COALESCE(?, full_name),
      course = COALESCE(?, course),
      pinfl = COALESCE(?, pinfl),
      contract_number = COALESCE(?, contract_number),
      phone = COALESCE(?, phone),
      telegram = COALESCE(?, telegram),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.full_name, data.course, data.pinfl, data.contract_number, data.phone, data.telegram, id)
}

export const deleteStudent = (id: number) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(id)
}

export const getPayments = (studentId?: number) => {
  if (studentId) {
    return db.prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC').all(studentId) as Payment[]
  }
  return db.prepare('SELECT * FROM payments ORDER BY date DESC').all() as Payment[]
}

export const createPayment = (data: Partial<Payment>) => {
  const result = db.prepare(`
    INSERT INTO payments (student_id, amount, date, status, payment_method, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.student_id,
    data.amount,
    data.date || new Date().toISOString().split('T')[0],
    data.status || 'paid',
    data.payment_method || 'cash',
    data.recorded_by || 'admin'
  )
  return result.lastInsertRowid
}

export const getStats = (institution?: string) => {
  let whereClause = institution ? 'WHERE s.institution = ?' : ''
  const params = institution ? [institution] : []
  
  const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM students ${whereClause}`).get(...params) as { count: number }
  
  const paidPayments = db.prepare(`
    SELECT COALESCE(SUM(p.amount), 0) as total 
    FROM payments p 
    JOIN students s ON p.student_id = s.id 
    WHERE p.status = 'paid' ${institution ? 'AND s.institution = ?' : ''}
  `).get(...params) as { total: number }
  
  const totalDebt = db.prepare(`
    SELECT COALESCE(SUM(p.amount), 0) as total 
    FROM payments p 
    JOIN students s ON p.student_id = s.id 
    WHERE p.status != 'paid' ${institution ? 'AND s.institution = ?' : ''}
  `).get(...params) as { total: number }
  
  const contractTotal = db.prepare(`
    SELECT COALESCE(SUM(contract_amount), 0) as total 
    FROM students ${whereClause}
  `).get(...params) as { total: number }
  
  const collectionRate = contractTotal.total > 0 
    ? Math.round((paidPayments.total / contractTotal.total) * 100) 
    : 0
  
  return {
    totalStudents: totalStudents.count,
    totalPayments: paidPayments.total,
    totalDebt: totalDebt.total,
    collectionRate
  }
}

export const getMonthlyStats = (institution?: string) => {
  let query = `
    SELECT strftime('%Y-%m', p.date) as month, SUM(p.amount) as total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.status = 'paid'
  `
  if (institution) query += ' AND s.institution = ?'
  query += ' GROUP BY month ORDER BY month'
  
  const params = institution ? [institution] : []
  return db.prepare(query).all(...params) as { month: string, total: number }[]
}

export const getTopDebtors = (institution?: string, limit = 5) => {
  let query = `
    SELECT s.id, s.full_name, s.phone, s.telegram, s.contract_amount,
           COALESCE(SUM(CASE WHEN p.status != 'paid' THEN p.amount ELSE 0 END), 0) as debt
    FROM students s
    LEFT JOIN payments p ON s.id = p.student_id
  `
  if (institution) query += ' WHERE s.institution = ?'
  query += ' GROUP BY s.id ORDER BY debt DESC LIMIT ?'
  
  const params = institution ? [institution, limit] : [limit]
  return db.prepare(query).all(...params) as any[]
}

export const verifyUser = (username: string, password: string) => {
  return db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as User | undefined
}