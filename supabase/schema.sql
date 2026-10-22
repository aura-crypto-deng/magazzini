-- =====================================================================
-- MAGAZZINO · Lorenzo Pazzaglia Parfum — schema database (PostgreSQL / Supabase)
-- Incolla tutto nel "SQL Editor" di Supabase ed esegui UNA volta sola.
-- =====================================================================

-- ---------- PROFILI UTENTE (collegati a Supabase Auth) ----------
create type ruolo_utente as enum ('admin', 'operatore');

create table profili (
  id    uuid primary key references auth.users on delete cascade,
  nome  text not null,
  ruolo ruolo_utente not null default 'operatore'
);

-- Crea automaticamente il profilo quando aggiungi un utente da Authentication
create function nuovo_utente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profili (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger alla_creazione_utente after insert on auth.users
  for each row execute function nuovo_utente();

-- Funzione di utilità: l'utente corrente è admin?
create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid() and ruolo = 'admin')
$$;

-- ---------- PROFUMI: modello + varianti di capacità (= SKU) ----------
create table profumi (
  id   uuid primary key default gen_random_uuid(),
  nome text not null unique,
  note text
);

create table varianti (
  id          uuid primary key default gen_random_uuid(),
  profumo_id  uuid not null references profumi on delete restrict,
  sku         text not null unique,
  capacita_ml int  not null check (capacita_ml in (28, 50, 75)),
  quantita    int  not null default 0 check (quantita >= 0),
  ubicazione  text,
  soglia_min  int  not null default 0 check (soglia_min >= 0),
  note        text,
  unique (profumo_id, capacita_ml)           -- una sola variante per capacità
);

-- ---------- MATERIALI / ACCESSORI ----------
create table materiali (
  id          uuid primary key default gen_random_uuid(),
  codice      text not null unique,
  descrizione text not null,
  categoria   text not null check (categoria in ('scatola','tappo','campione','altro')),
  quantita    int  not null default 0 check (quantita >= 0),
  ubicazione  text,
  soglia_min  int  not null default 0 check (soglia_min >= 0),
  note        text
);

-- ---------- MOVIMENTI ----------
create table movimenti (
  id           uuid primary key default gen_random_uuid(),
  variante_id  uuid references varianti  on delete restrict,
  materiale_id uuid references materiali on delete restrict,
  tipo         text not null check (tipo in ('carico','scarico')),
  quantita     int  not null check (quantita > 0),
  data         date not null default current_date,
  causale      text not null,
  note         text,
  utente_id    uuid not null default auth.uid() references profili,
  creato_il    timestamptz not null default now(),
  -- un movimento riguarda ESATTAMENTE un articolo (o un profumo o un materiale)
  check (num_nonnulls(variante_id, materiale_id) = 1)
);
create index on movimenti (data desc);
create index on movimenti (variante_id);
create index on movimenti (materiale_id);

-- Aggiorna la giacenza in automatico e blocca gli scarichi che andrebbero sotto zero.
-- L'UPDATE blocca la riga: due persone che scaricano insieme non si sovrascrivono.
create function applica_movimento() returns trigger
language plpgsql security definer set search_path = public as $$
declare nuova int;
        delta int := case when new.tipo = 'carico' then new.quantita else -new.quantita end;
begin
  if new.variante_id is not null then
    update varianti set quantita = quantita + delta where id = new.variante_id returning quantita into nuova;
  else
    update materiali set quantita = quantita + delta where id = new.materiale_id returning quantita into nuova;
  end if;
  if nuova is null then raise exception 'Articolo non trovato'; end if;
  if nuova < 0 then
    raise exception 'Giacenza insufficiente: lo scarico porterebbe la giacenza sotto zero';
  end if;
  return new;
end $$;

create trigger dopo_movimento after insert on movimenti
  for each row execute function applica_movimento();

-- ---------- VISTE (comode per l'app) ----------
create view v_articoli with (security_invoker = true) as
  select 'profumo'::text as tipo, v.id, v.sku as codice, p.nome as descrizione,
         'profumo'::text as categoria, v.capacita_ml, v.quantita, v.ubicazione,
         v.soglia_min, v.note, p.id as profumo_id, (v.quantita < v.soglia_min) as sotto_soglia
    from varianti v join profumi p on p.id = v.profumo_id
  union all
  select 'materiale', m.id, m.codice, m.descrizione, m.categoria, null::int, m.quantita,
         m.ubicazione, m.soglia_min, m.note, null::uuid, (m.quantita < m.soglia_min)
    from materiali m;

create view v_movimenti with (security_invoker = true) as
  select mv.id, mv.creato_il, mv.data, mv.tipo, mv.quantita, mv.causale, mv.note,
         mv.utente_id, pr.nome as utente, a.codice, a.descrizione, a.capacita_ml
    from movimenti mv
    left join profili pr on pr.id = mv.utente_id
    left join v_articoli a on a.id = coalesce(mv.variante_id, mv.materiale_id);

-- ---------- SICUREZZA (Row Level Security) ----------
alter table profili   enable row level security;
alter table profumi   enable row level security;
alter table varianti  enable row level security;
alter table materiali enable row level security;
alter table movimenti enable row level security;

-- Tutti gli utenti loggati possono LEGGERE
create policy leggi on profili   for select to authenticated using (true);
create policy leggi on profumi   for select to authenticated using (true);
create policy leggi on varianti  for select to authenticated using (true);
create policy leggi on materiali for select to authenticated using (true);
create policy leggi on movimenti for select to authenticated using (true);

-- Solo gli ADMIN modificano anagrafiche e ruoli
create policy admin_scrive on profili   for update to authenticated using (is_admin()) with check (is_admin());
create policy admin_scrive on profumi   for all    to authenticated using (is_admin()) with check (is_admin());
create policy admin_scrive on varianti  for all    to authenticated using (is_admin()) with check (is_admin());
create policy admin_scrive on materiali for all    to authenticated using (is_admin()) with check (is_admin());

-- Tutti possono REGISTRARE movimenti, ma solo a proprio nome.
-- Nessuna policy di update/delete: lo storico non si può modificare né cancellare.
create policy inserisci on movimenti for insert to authenticated with check (utente_id = auth.uid());

-- Le giacenze cambiano SOLO tramite movimenti (il trigger è "security definer"):
-- nessuno può ritoccare "quantita" a mano dall'API. Concediamo solo le altre colonne.
revoke insert, update on varianti  from authenticated, anon;
revoke insert, update on materiali from authenticated, anon;
revoke update on profili from authenticated, anon;
grant insert (profumo_id, sku, capacita_ml, ubicazione, soglia_min, note),
      update (profumo_id, sku, capacita_ml, ubicazione, soglia_min, note) on varianti to authenticated;
grant insert (codice, descrizione, categoria, ubicazione, soglia_min, note),
      update (codice, descrizione, categoria, ubicazione, soglia_min, note) on materiali to authenticated;
grant update (nome, ruolo) on profili to authenticated;
