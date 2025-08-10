-- Enable extensions (on Supabase)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Tenants
create table if not exists public.tenants(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Profiles (one per auth.user)
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('admin','agent','customer')),
  created_at timestamptz default now()
);

-- Assets
create table if not exists public.assets(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tag text unique,
  qrid text unique,
  model text,
  location text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Tickets
create table if not exists public.tickets(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','waiting_customer','blocked','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_by uuid not null references public.profiles(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  sla_due_at timestamptz,
  created_at timestamptz default now()
);

-- Ticket events
create table if not exists public.ticket_events(
  id bigserial primary key,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.assets enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;

-- Helper policy: a user's tenant is the one in profiles where profiles.id = auth.uid()
-- Policies: users can only access rows whose tenant_id equals their profile's tenant_id.
-- We use EXISTS subqueries so we don't need custom claims.

-- PROFILES
create policy "profiles_owner_read" on public.profiles
for select using ( auth.uid() = id );

create policy "profiles_owner_update" on public.profiles
for update using ( auth.uid() = id );

-- TENANTS: readable to users inside the tenant (optional), no inserts/updates via client
create policy "tenants_read_by_members" on public.tenants
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = tenants.id)
);

-- ASSETS
create policy "assets_tenant_rw" on public.assets
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = assets.tenant_id)
);
create policy "assets_tenant_insert" on public.assets
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = assets.tenant_id)
);
create policy "assets_tenant_update" on public.assets
for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = assets.tenant_id)
);

-- TICKETS
create policy "tickets_tenant_rw" on public.tickets
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = tickets.tenant_id)
);
create policy "tickets_tenant_insert" on public.tickets
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = tickets.tenant_id)
);
create policy "tickets_tenant_update" on public.tickets
for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = tickets.tenant_id)
);

-- TICKET_EVENTS
create policy "events_tenant_rw" on public.ticket_events
for select using (
  exists (
    select 1
    from public.tickets t
    join public.profiles p on p.id = auth.uid()
    where t.id = ticket_events.ticket_id and t.tenant_id = p.tenant_id
  )
);
create policy "events_tenant_insert" on public.ticket_events
for insert with check (
  exists (
    select 1
    from public.tickets t
    join public.profiles p on p.id = auth.uid()
    where t.id = ticket_events.ticket_id and t.tenant_id = p.tenant_id
  )
);

-- Minimal seed function callable from server (API route uses service role)
create or replace function public.seed_demo(user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  ten_id uuid;
begin
  -- Create tenant
  insert into public.tenants(name) values ('Tenant Demo')
  returning id into ten_id;

  -- Create profile for caller
  insert into public.profiles(id, tenant_id, role) values (user_id, ten_id, 'admin')
  on conflict (id) do update set tenant_id = excluded.tenant_id;

  -- One asset
  insert into public.assets(tenant_id, tag, qrid, model, location)
  values (ten_id, 'ASSET-001', 'QR-001', 'Equipo Demo 2000', 'Depósito');

  -- One ticket
  insert into public.tickets(tenant_id, asset_id, title, description, status, priority, created_by)
  values (
    ten_id,
    (select id from public.assets where tenant_id = ten_id limit 1),
    'Ticket inicial', 'Ticket de prueba creado por seed', 'open', 'normal', user_id
  );
end;
$$;
