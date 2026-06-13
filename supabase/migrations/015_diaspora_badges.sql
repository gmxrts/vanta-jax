alter table businesses
  add column if not exists african_diaspora boolean not null default false,
  add column if not exists caribbean_diaspora boolean not null default false;
