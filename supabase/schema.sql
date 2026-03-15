create extension if not exists pgcrypto;

create table if not exists "ProviderConfig" (
  providerId text primary key,
  enabled boolean not null default true,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

insert into "ProviderConfig" (providerId, enabled)
values
  ('mock', true),
  ('google', true),
  ('serpapi', true),
  ('serpapi_region', true),
  ('parsehub', true)
on conflict (providerId) do nothing;

create table if not exists "ScoringConfig" (
  key text primary key,
  config text not null,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

insert into "ScoringConfig" (key, config)
values (
  'default',
  '{"points":{"noOfficialWebsite":40,"ratingGte":{"threshold":4.3,"points":20},"reviewsGte":{"threshold":100,"points":20},"hasSocialNoWebsite":10,"sellableCategory":10},"sellableCategories":["pizzeria","ristorante","pub"],"priority":{"highGte":70,"mediumGte":40}}'
)
on conflict (key) do nothing;

create table if not exists "BlacklistDomain" (
  id bigserial primary key,
  domain text unique not null,
  createdAt timestamptz not null default now()
);

create table if not exists "SearchJob" (
  id uuid primary key default gen_random_uuid(),
  providerId text not null,
  status text not null,
  params text,
  rawResultsCount integer not null default 0,
  validResults integer not null default 0,
  errorMessage text,
  createdAt timestamptz not null default now(),
  finishedAt timestamptz
);

create table if not exists "Lead" (
  id uuid primary key default gen_random_uuid(),
  businessName text not null,
  slug text not null unique,
  category text,
  address text,
  city text,
  province text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  rating double precision,
  reviewsCount integer,
  reviewsRange text,
  websitePresence text,
  hasOfficialWebsite boolean not null default false,
  officialWebsiteUrl text,
  instagramUrl text,
  facebookUrl text,
  sourceUrl text,
  provider text not null,
  providerRaw jsonb,
  isVerifiedActive boolean not null default true,
  chainDetected boolean not null default false,
  leadScore integer not null default 0,
  scoreReasons jsonb,
  priorityLevel text not null default 'low',
  normalizedName text,
  normalizedAddress text,
  normalizedPhone text,
  normalizedEmail text,
  normalizedDomain text,
  status text not null default 'new',
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create index if not exists "Lead_normalizedPhone_idx" on "Lead"(normalizedPhone);
create index if not exists "Lead_normalizedEmail_idx" on "Lead"(normalizedEmail);
create index if not exists "Lead_status_idx" on "Lead"(status);
create index if not exists "Lead_priorityLevel_idx" on "Lead"(priorityLevel);
create index if not exists "Lead_hasOfficialWebsite_idx" on "Lead"(hasOfficialWebsite);
create index if not exists "Lead_updatedAt_idx" on "Lead"(updatedAt);

