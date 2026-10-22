-- Esegui UNA volta nel SQL Editor di Supabase (se hai già installato lo schema precedente).
-- Aggiunge l'immagine ai profumi e aggiorna la vista degli articoli.
alter table profumi add column if not exists immagine_url text;

create or replace view v_articoli with (security_invoker = true) as
  select 'profumo'::text as tipo, v.id, v.sku as codice, p.nome as descrizione,
         'profumo'::text as categoria, v.capacita_ml, v.quantita, v.ubicazione,
         v.soglia_min, v.note, p.id as profumo_id, (v.quantita < v.soglia_min) as sotto_soglia,
         p.immagine_url
    from varianti v join profumi p on p.id = v.profumo_id
  union all
  select 'materiale', m.id, m.codice, m.descrizione, m.categoria, null::int, m.quantita,
         m.ubicazione, m.soglia_min, m.note, null::uuid, (m.quantita < m.soglia_min), null::text
    from materiali m;
