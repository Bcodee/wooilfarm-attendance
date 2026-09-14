-- WOOILFARM FieldLog · run in Supabase SQL Editor before adding keys to supabase.js
-- For production, sign employees in with Supabase Auth and replace the temporary
-- dashboard policies below with policies that map auth.uid() to an employee/profile.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  initials text,
  team text not null,
  role text,
  color text default 'mint',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  created_at timestamptz not null default now(),
  unique(employee_id, work_date),
  check  (check_out is null or check_in is null or check_out >= check_in)
);

create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project text not null,
  task_type text not null,
  work_date date not null default current_date,
  start_time time not null,
  end_time time not null,
  notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists attendance_records_date_idx on public.attendance_records(work_date);
create index if not exists work_logs_date_idx on public.work_logs(work_date);

alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.work_logs enable row level security;

-- Starter policies for an internal farm dashboard. Change these before exposing the app publicly.
create policy "FieldLog read employees" on public.employees for select using (true);
create policy "FieldLog add employees" on public.employees for insert with check (true);
create policy "FieldLog read attendance" on public.attendance_records for select using (true);
create policy "FieldLog add attendance" on public.attendance_records for insert with check (true);
create policy "FieldLog update attendance" on public.attendance_records for update using (true) with check (true);
create policy "FieldLog read work logs" on public.work_logs for select using (true);
create policy "FieldLog add work logs" on public.work_logs for insert with check (true);
