-- Switchback initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Areas: hiking regions people live in or travel to
-- ---------------------------------------------------------------------------
create table public.areas (
  id text primary key,
  name text not null,
  short_name text not null,
  state text not null,
  lat double precision not null,
  lng double precision not null
);

insert into public.areas (id, name, short_name, state, lat, lng) values
  ('palm-desert',   'Palm Desert / Palm Springs, CA', 'Palm Desert',  'CA', 33.7222, -116.3745),
  ('idyllwild',     'Idyllwild, CA',                  'Idyllwild',    'CA', 33.7400, -116.7189),
  ('joshua-tree',   'Joshua Tree, CA',                'Joshua Tree',  'CA', 34.1347, -116.3131),
  ('big-bear',      'Big Bear Lake, CA',              'Big Bear',     'CA', 34.2439, -116.9114),
  ('los-angeles',   'Los Angeles, CA',                'Los Angeles',  'CA', 34.0522, -118.2437),
  ('san-diego',     'San Diego, CA',                  'San Diego',    'CA', 32.7157, -117.1611),
  ('orange-county', 'Orange County, CA',              'Orange County','CA', 33.7175, -117.8311),
  ('santa-barbara', 'Santa Barbara, CA',              'Santa Barbara','CA', 34.4208, -119.6982),
  ('mammoth',       'Mammoth Lakes, CA',              'Mammoth',      'CA', 37.6485, -118.9721),
  ('lone-pine',     'Lone Pine / Mt. Whitney, CA',    'Lone Pine',    'CA', 36.6060, -118.0629),
  ('yosemite',      'Yosemite, CA',                   'Yosemite',     'CA', 37.8651, -119.5383),
  ('lake-tahoe',    'Lake Tahoe, CA/NV',              'Tahoe',        'CA', 39.0968, -120.0324),
  ('bay-area',      'San Francisco Bay Area, CA',     'Bay Area',     'CA', 37.7749, -122.4194),
  ('sedona',        'Sedona, AZ',                     'Sedona',       'AZ', 34.8697, -111.7610),
  ('phoenix',       'Phoenix, AZ',                    'Phoenix',      'AZ', 33.4484, -112.0740),
  ('grand-canyon',  'Grand Canyon, AZ',               'Grand Canyon', 'AZ', 36.0544, -112.1401),
  ('zion',          'Springdale, UT (Zion)',          'Zion',         'UT', 37.1889, -113.0004),
  ('moab',          'Moab, UT',                       'Moab',         'UT', 38.5733, -109.5498),
  ('las-vegas',     'Las Vegas, NV',                  'Las Vegas',    'NV', 36.1699, -115.1398),
  ('denver',        'Denver / Front Range, CO',       'Denver',       'CO', 39.7392, -104.9903),
  ('seattle',       'Seattle, WA',                    'Seattle',      'WA', 47.6062, -122.3321),
  ('st-louis',      'St. Louis, MO',                  'St. Louis',    'MO', 38.6270, -90.1994);

-- ---------------------------------------------------------------------------
-- Profiles (public to signed-in users) + private details (owner only)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  birthdate date not null,
  bio text not null default '' check (char_length(bio) <= 500),
  levels text[] not null default '{}'
    check (levels <@ array['Easy','Moderate','Hard','Extreme']::text[]),
  availability text not null default '' check (char_length(availability) <= 60),
  top_hikes text[] not null default '{}' check (cardinality(top_hikes) <= 3),
  home_area text not null references public.areas (id),
  travel_area text references public.areas (id),
  travel_from date,
  travel_to date,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (travel_area is null or (travel_from is not null and travel_to is not null and travel_to >= travel_from))
);

create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  emergency_name text not null default '',
  emergency_phone text not null default ''
);

-- Adults only
create or replace function public.enforce_adult() returns trigger
language plpgsql as $$
begin
  if new.birthdate > (current_date - interval '18 years') then
    raise exception 'You must be 18 or older to use Switchback';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_adult before insert or update on public.profiles
  for each row execute function public.enforce_adult();

-- ---------------------------------------------------------------------------
-- Likes / passes, matches, messages
-- ---------------------------------------------------------------------------
create table public.swipes (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null default 'text' check (kind in ('text', 'system')),
  created_at timestamptz not null default now()
);
create index messages_match_idx on public.messages (match_id, created_at);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now()
);

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Mutual like => match
create or replace function public.handle_swipe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.liked and not public.is_blocked(new.from_id, new.to_id) and exists (
    select 1 from swipes where from_id = new.to_id and to_id = new.from_id and liked
  ) then
    insert into matches (user_a, user_b)
    values (least(new.from_id, new.to_id), greatest(new.from_id, new.to_id))
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger swipes_match after insert or update on public.swipes
  for each row execute function public.handle_swipe();

-- Blocking removes any match between the two people
create or replace function public.handle_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from matches
  where user_a = least(new.blocker_id, new.blocked_id)
    and user_b = greatest(new.blocker_id, new.blocked_id);
  return new;
end $$;

create trigger blocks_unmatch after insert on public.blocks
  for each row execute function public.handle_block();

-- ---------------------------------------------------------------------------
-- Group trips
-- ---------------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  area_id text not null references public.areas (id),
  trail text not null check (char_length(trail) between 1 and 120),
  starts_at timestamptz not null,
  level text not null check (level in ('Easy','Moderate','Hard','Extreme')),
  spots int not null default 3 check (spots between 1 and 20),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index trips_area_idx on public.trips (area_id, starts_at);

create table public.trip_requests (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Safety: hike plans with check-in alerts
-- ---------------------------------------------------------------------------
create table public.hike_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  trail text not null check (char_length(trail) between 1 and 120),
  partner_name text not null default '',
  back_by timestamptz not null,
  contact_name text not null check (char_length(contact_name) between 1 and 60),
  contact_phone text not null check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  checked_in_at timestamptz,
  alert_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index hike_plans_due_idx on public.hike_plans (back_by)
  where checked_in_at is null and alert_sent_at is null;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.trips enable row level security;
alter table public.trip_requests enable row level security;
alter table public.hike_plans enable row level security;

create policy "areas readable" on public.areas for select to authenticated, anon using (true);

create policy "profiles readable" on public.profiles for select to authenticated
  using (not public.is_blocked(auth.uid(), id));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile delete" on public.profiles for delete to authenticated using (id = auth.uid());

create policy "own private all" on public.profile_private for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own swipes read" on public.swipes for select to authenticated using (from_id = auth.uid());
create policy "own swipes write" on public.swipes for insert to authenticated with check (from_id = auth.uid());
create policy "own swipes update" on public.swipes for update to authenticated using (from_id = auth.uid()) with check (from_id = auth.uid());

create policy "my matches" on public.matches for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy "unmatch" on public.matches for delete to authenticated
  using (auth.uid() in (user_a, user_b));

create policy "read my messages" on public.messages for select to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b)));
create policy "send messages" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b))
  );

create policy "own blocks" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "file reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

create policy "trips readable" on public.trips for select to authenticated
  using (not public.is_blocked(auth.uid(), host_id));
create policy "host trips" on public.trips for insert to authenticated with check (host_id = auth.uid());
create policy "host trips update" on public.trips for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "host trips delete" on public.trips for delete to authenticated using (host_id = auth.uid());

create policy "see requests" on public.trip_requests for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.trips t where t.id = trip_id and t.host_id = auth.uid()));
create policy "request to join" on public.trip_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending'
    and not exists (select 1 from public.trips t where t.id = trip_id and t.host_id = auth.uid()));
create policy "cancel request" on public.trip_requests for delete to authenticated using (user_id = auth.uid());
create policy "host decides" on public.trip_requests for update to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.host_id = auth.uid()));

create policy "own plans" on public.hike_plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

-- People to show in Discover for an area: lives there, or is visiting soon.
create or replace function public.discover(p_area text, p_levels text[])
returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select p.* from profiles p
  where p.id <> auth.uid()
    and (p.home_area = p_area or (p.travel_area = p_area and p.travel_to >= current_date))
    and p.levels && p_levels
    and not exists (select 1 from swipes s where s.from_id = auth.uid() and s.to_id = p.id)
    and not public.is_blocked(auth.uid(), p.id)
  order by p.created_at desc
  limit 50;
$$;

-- Trips in an area with spots remaining and my request status.
create or replace function public.trips_in_area(p_area text)
returns table (
  id uuid, host_id uuid, host_name text, area_id text, trail text, starts_at timestamptz,
  level text, spots int, note text, accepted int, pending int, my_status text
)
language sql stable security definer set search_path = public as $$
  select t.id, t.host_id, p.display_name, t.area_id, t.trail, t.starts_at, t.level, t.spots, t.note,
    (select count(*)::int from trip_requests r where r.trip_id = t.id and r.status = 'accepted'),
    (select count(*)::int from trip_requests r where r.trip_id = t.id and r.status = 'pending'),
    (select r.status from trip_requests r where r.trip_id = t.id and r.user_id = auth.uid())
  from trips t join profiles p on p.id = t.host_id
  where t.area_id = p_area
    and t.starts_at > now() - interval '12 hours'
    and not public.is_blocked(auth.uid(), t.host_id)
  order by t.starts_at;
$$;

-- My matches with the other person and the latest message.
create or replace function public.my_matches()
returns table (match_id uuid, created_at timestamptz, other jsonb, last_body text, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.created_at, to_jsonb(o.*),
    lm.body, lm.created_at
  from matches m
  join profiles o on o.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join lateral (
    select body, created_at from messages where match_id = m.id order by created_at desc limit 1
  ) lm on true
  where auth.uid() in (m.user_a, m.user_b)
  order by coalesce(lm.created_at, m.created_at) desc;
$$;

revoke execute on function public.discover(text, text[]) from anon;
revoke execute on function public.trips_in_area(text) from anon;
revoke execute on function public.my_matches() from anon;

-- Live chat
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Profile photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
