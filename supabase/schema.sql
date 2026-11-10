-- Nokto schema. Run once in Supabase → SQL Editor.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area text not null check (area in ('health','hobbies','work','business','friends','family','purpose','money','relationship','other')),
  title text not null,
  note text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  area text check (area in ('health','hobbies','work','business','friends','family','purpose','money','relationship','other')),
  priority smallint not null default 3 check (priority between 1 and 3),
  due_date date,
  due_time time,
  recurrence jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals(user_id, area);
create index if not exists todos_user_idx on public.todos(user_id, completed_at);

alter table public.goals enable row level security;
alter table public.todos enable row level security;

drop policy if exists "own goals" on public.goals;
create policy "own goals" on public.goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own todos" on public.todos;
create policy "own todos" on public.todos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed North Star placeholder goals for every new account.
create or replace function public.seed_goals(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.goals (user_id, area, title, position)
  select uid, g.area, g.title, g.pos from (values
    ('health','Run a marathon',0),('health','Reach and keep my ideal weight',1),('health','Sleep 8 hours consistently',2),('health','Do a 7-day silent retreat',3),
    ('hobbies','Learn to play the piano',0),('hobbies','Become fluent in a new language',1),('hobbies','Learn to surf',2),('hobbies','Write a book',3),
    ('work','Become a recognized expert in my field',0),('work','Speak at a major conference',1),('work','Lead a team I''m proud of',2),
    ('business','Launch my own company',0),('business','Reach $1M in annual revenue',1),('business','Build something that runs without me',2),
    ('friends','Take a trip with my closest friends every year',0),('friends','Host a regular dinner for friends',1),('friends','Reconnect with an old friend',2),
    ('family','Take my parents on their dream trip',0),('family','Record my grandparents'' life stories',1),('family','Be there for every important family moment',2),
    ('purpose','Write down my personal mission',0),('purpose','Mentor 10 people',1),('purpose','Give back to a cause I care about',2),
    ('money','Build a 6-month emergency fund',0),('money','Become debt-free',1),('money','Reach financial independence',2),('money','Buy my own home',3),
    ('relationship','Find a partner I deeply love',0),('relationship','Get married',1),('relationship','Plan a once-in-a-lifetime honeymoon',2),
    ('other','Visit 50 countries',0),('other','See the Northern Lights',1),('other','Skydive',2)
  ) as g(area, title, pos);
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_goals(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed accounts that already existed before this script ran.
do $$
declare u record;
begin
  for u in select id from auth.users where not exists (select 1 from public.goals g where g.user_id = auth.users.id) loop
    perform public.seed_goals(u.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Magic-link handoff: lets the iPhone home-screen app finish a sign-in whose
-- email link opened in Safari. Stores only the one-time PKCE code, which is
-- useless without the verifier that stays inside the app. Rows live minutes.
create table if not exists public.auth_handoffs (
  id text primary key,
  code text not null,
  flow_id text,
  created_at timestamptz not null default now()
);
alter table public.auth_handoffs enable row level security; -- no policies: access only via the functions below

create or replace function public.put_handoff(p_id text, p_code text, p_flow_id text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(p_id) < 32 or length(p_id) > 128 or length(p_code) > 256 or length(coalesce(p_flow_id, '')) > 64 then
    raise exception 'invalid handoff';
  end if;
  delete from public.auth_handoffs where created_at < now() - interval '15 minutes';
  insert into public.auth_handoffs (id, code, flow_id) values (p_id, p_code, p_flow_id)
    on conflict (id) do update set code = excluded.code, flow_id = excluded.flow_id, created_at = now();
end $$;

create or replace function public.take_handoff(p_id text) returns table (code text, flow_id text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    delete from public.auth_handoffs h
    where h.id = p_id and h.created_at > now() - interval '10 minutes'
    returning h.code, h.flow_id;
end $$;

revoke all on function public.put_handoff(text, text, text) from public;
revoke all on function public.take_handoff(text) from public;
grant execute on function public.put_handoff(text, text, text) to anon, authenticated;
grant execute on function public.take_handoff(text) to anon, authenticated;
