-- CONTROLE DE TELAS | INDEMETAL — migração (sem blocos DO)
create extension if not exists pgcrypto;

create table if not exists operadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists motivos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tamanhos_tela (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists telas_rasgadas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  operador text not null,
  motivo text not null,
  tamanho text,
  observacao text,
  created_at timestamptz not null default now()
);

create table if not exists desplaques (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  unidade text not null check (unidade in ('Etiquetas','Gráficos')),
  quantidade integer not null check (quantidade >= 0),
  created_at timestamptz not null default now()
);

create table if not exists banhos_removedor (
  id uuid primary key default gen_random_uuid(),
  data_inicio date not null,
  data_fim date,
  total_telas integer,
  created_at timestamptz not null default now()
);

create table if not exists quadros_descartados (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tamanho text,
  motivo text,
  observacao text,
  created_at timestamptz not null default now()
);

alter table operadores enable row level security;
alter table motivos enable row level security;
alter table tamanhos_tela enable row level security;
alter table telas_rasgadas enable row level security;
alter table desplaques enable row level security;
alter table banhos_removedor enable row level security;
alter table quadros_descartados enable row level security;

create policy "authenticated_select_operadores" on operadores for select to authenticated using (true);
create policy "authenticated_insert_operadores" on operadores for insert to authenticated with check (true);
create policy "authenticated_select_motivos" on motivos for select to authenticated using (true);
create policy "authenticated_insert_motivos" on motivos for insert to authenticated with check (true);
create policy "authenticated_select_tamanhos" on tamanhos_tela for select to authenticated using (true);
create policy "authenticated_insert_tamanhos" on tamanhos_tela for insert to authenticated with check (true);
create policy "authenticated_select_telas" on telas_rasgadas for select to authenticated using (true);
create policy "authenticated_insert_telas" on telas_rasgadas for insert to authenticated with check (true);
create policy "authenticated_select_desplaques" on desplaques for select to authenticated using (true);
create policy "authenticated_insert_desplaques" on desplaques for insert to authenticated with check (true);
create policy "authenticated_select_banhos" on banhos_removedor for select to authenticated using (true);
create policy "authenticated_insert_banhos" on banhos_removedor for insert to authenticated with check (true);
create policy "authenticated_select_descartes" on quadros_descartados for select to authenticated using (true);
create policy "authenticated_insert_descartes" on quadros_descartados for insert to authenticated with check (true);