-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.site_content (
  id integer primary key check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
-- Intentionally create no anon/authenticated policies. Only the Netlify function
-- accesses this table using the service-role key stored as a Netlify environment variable.
