-- ============================================================
-- SubScout — Supabase Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  phone       text,                        -- for WhatsApp notifications
  notify_whatsapp boolean default false,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id    uuid default uuid_generate_v4() primary key,
  name  text not null,
  color text not null default '#8b5cf6',
  icon  text
);

insert into public.categories (name, color, icon) values
  ('Streaming',    '#8b5cf6', 'Tv'),
  ('Software',     '#3b82f6', 'Code'),
  ('Música',       '#ec4899', 'Music'),
  ('Nube',         '#06b6d4', 'Cloud'),
  ('Gaming',       '#f59e0b', 'Gamepad2'),
  ('Productividad','#10b981', 'Briefcase'),
  ('Noticias',     '#f97316', 'Newspaper'),
  ('Fitness',      '#ef4444', 'Dumbbell'),
  ('Otro',         '#6b7280', 'MoreHorizontal');

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create type billing_cycle as enum ('monthly', 'yearly', 'weekly', 'quarterly');
create type subscription_status as enum ('active', 'paused', 'cancelled');

create table public.subscriptions (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  name            text not null,
  description     text,
  url             text,
  logo_url        text,
  price           numeric(10, 2) not null check (price >= 0),
  currency        text not null default 'EUR',
  billing_cycle   billing_cycle not null default 'monthly',
  next_billing_date date not null,
  start_date      date not null default current_date,
  category_id     uuid references public.categories(id),
  status          subscription_status not null default 'active',
  -- Usage tracking (for optimization algorithm)
  last_used_at    date,
  used_this_month boolean not null default false,
  -- Notification settings
  notify_days_before int default 3 check (notify_days_before >= 0 and notify_days_before <= 30),
  -- Chrome extension metadata
  source          text default 'manual',   -- 'manual' | 'extension'
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table public.subscriptions enable row level security;

create policy "Users can CRUD own subscriptions"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SPENDING SNAPSHOTS (monthly history for charts)
-- ============================================================
create table public.spending_snapshots (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  month       date not null,               -- first day of the month
  total_spent numeric(10, 2) not null default 0,
  created_at  timestamptz default now() not null,
  unique (user_id, month)
);

alter table public.spending_snapshots enable row level security;

create policy "Users can view own snapshots"
  on public.spending_snapshots for select
  using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
create table public.notifications (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  sub_id      uuid references public.subscriptions(id) on delete cascade,
  type        text not null,               -- 'renewal_reminder' | 'optimization_tip'
  channel     text not null default 'whatsapp',
  message     text not null,
  sent_at     timestamptz default now(),
  status      text not null default 'sent' -- 'sent' | 'failed'
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Monthly cost normalized to monthly amount
create or replace view public.subscriptions_monthly_cost as
select
  s.*,
  case s.billing_cycle
    when 'weekly'    then s.price * 4.33
    when 'monthly'   then s.price
    when 'quarterly' then s.price / 3
    when 'yearly'    then s.price / 12
  end as monthly_cost,
  c.name  as category_name,
  c.color as category_color,
  c.icon  as category_icon
from public.subscriptions s
left join public.categories c on c.id = s.category_id
where s.status = 'active';

-- ============================================================
-- OPTIMIZATION FUNCTION
-- Returns subscriptions that haven't been used in 30 days
-- and cost more than a threshold
-- ============================================================
create or replace function public.get_optimization_candidates(
  p_user_id uuid,
  p_min_price numeric default 5
)
returns setof public.subscriptions_monthly_cost
language sql security definer as $$
  select *
  from public.subscriptions_monthly_cost
  where user_id = p_user_id
    and used_this_month = false
    and (
      last_used_at is null
      or last_used_at < current_date - interval '30 days'
    )
    and monthly_cost >= p_min_price
  order by monthly_cost desc;
$$;

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
