# School CRM 2026 - Premium Edition

Профессиональная CRM-система для частной школы и университета.

## Технологии

- **Next.js 14** (App Router)
- **Supabase** (Auth + Database)
- **TypeScript**
- **Recharts** (графики)
- **jsPDF** (генерация PDF)

## Установка

```bash
npm install
```

## Настройка

1. Создай проект на https://supabase.com
2. Создай таблицы:
```sql
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  course TEXT NOT NULL,
  birth_date DATE,
  pinfl TEXT,
  contract_number TEXT,
  phone TEXT,
  telegram TEXT,
  institution TEXT DEFAULT 'school',
  contract_amount REAL DEFAULT 6000000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'paid',
  payment_method TEXT DEFAULT 'cash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Создай пользователей в Supabase Authentication
4. Скопируй `.env.example` в `.env.local` и добавь свои ключи:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Запуск

```bash
npm run dev
```

## Деплой

1. Загрузи на GitHub
2. Подключи на Vercel
3. Добавь переменные окружения

## Функции

- ✅ Авторизация через Supabase
- ✅ Dashboard со статистикой
- ✅ Управление студентами
- ✅ История платежей
- ✅ Генерация PDF (договор, претензия, квитанция)
- ✅ Графики поступлений
- ✅ Топ должников
- ✅ School / University разделение
- ✅ Поиск и фильтры

## Лицензия

MIT