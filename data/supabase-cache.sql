-- PackTrail 전용 공개 자료 저장소. 브라우저에서 직접 접근하지 않는다.
create table if not exists public.packtrail_discoveries (
  market text not null,
  url text not null,
  title text not null,
  description text not null default '',
  published_date text not null default '',
  last_seen_at timestamptz not null default now(),
  primary key (market, url)
);
alter table public.packtrail_discoveries enable row level security;
revoke all on public.packtrail_discoveries from public, anon, authenticated;
grant select, insert, update on public.packtrail_discoveries to service_role;
