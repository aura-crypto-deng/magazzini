// Anagrafica articoli: profumi (con varianti di capacità) e materiali. Solo gli admin modificano.
import { useEffect, useState } from 'react'
import { supabase, ok } from '../lib/supabase'
import { scaricaCSV, oggi } from '../lib/utils'
import Scanner from '../components/Scanner'
import Thumb from '../components/Thumb'
import Icon from '../components/Icon'

const CATEGORIE = ['profumo', 'scatola', 'tappo', 'campione', 'altro']
const VUOTO = { tipo: 'profumo', categoria: 'scatola', codice: '', descrizione: '', capacita_ml: 50, ubicazione: '', soglia_min: 0, note: '', immagine_url: '', quantita_iniziale: 0 }

export default function Articoli({ admin }) {
  const [righe, setRighe] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [cap, setCap] = useState('')
  const [form, setForm] = useState(null)
  const [scan, setScan] = useState(false)
  const [errore, setErrore] = useState('')

  const carica = async () => {
    const { data, error } = await supabase.from('v_articoli').select('*').order('descrizione').order('capacita_ml')
    if (error) setErrore(error.message)
    setRighe(data || [])
  }
  useEffect(() => { carica() }, [])

  const filtrate = righe.filter((r) =>
    (!q || `${r.descrizione} ${r.codice}`.toLowerCase().includes(q.toLowerCase())) &&
    (!cat || r.categoria === cat) && (!cap || String(r.capacita_ml) === cap))

  // Raggruppa le varianti per profumo (una scheda per modello) e separa i materiali
  const profumi = Object.values(filtrate.filter((r) => r.tipo === 'profumo').reduce((acc, r) => {
    ;(acc[r.profumo_id] ??= { id: r.profumo_id, nome: r.descrizione, img: r.immagine_url, varianti: [] }).varianti.push(r)
    return acc
  }, {}))
  const materiali = filtrate.filter((r) => r.tipo === 'materiale')

  async function salva(f) {
    setErrore('')
    try {
      const comuni = { ubicazione: f.ubicazione || null, soglia_min: +f.soglia_min || 0, note: f.note || null }
      if (f.id) {
        // ---- MODIFICA ----
        if (f.tipo === 'profumo') {
          await ok(supabase.from('profumi').update({ nome: f.descrizione, immagine_url: f.immagine_url || null }).eq('id', f.profumo_id))
          await ok(supabase.from('varianti').update({ sku: f.codice, capacita_ml: +f.capacita_ml, ...comuni }).eq('id', f.id))
        } else {
          await ok(supabase.from('materiali').update({ codice: f.codice, descrizione: f.descrizione, categoria: f.categoria, ...comuni }).eq('id', f.id))
        }
      } else {
        // ---- NUOVO ----
        let id, colonna
        if (f.tipo === 'profumo') {
          // se il profumo esiste già (altra capacità) lo riuso, altrimenti lo creo
          let p = await ok(supabase.from('profumi').select('id').eq('nome', f.descrizione).maybeSingle())
          if (!p) p = await ok(supabase.from('profumi').insert({ nome: f.descrizione, immagine_url: f.immagine_url || null }).select('id').single())
          else if (f.immagine_url) await ok(supabase.from('profumi').update({ immagine_url: f.immagine_url }).eq('id', p.id))
          const v = await ok(supabase.from('varianti').insert({ profumo_id: p.id, sku: f.codice, capacita_ml: +f.capacita_ml, ...comuni }).select('id').single())
          id = v.id; colonna = 'variante_id'
        } else {
          const m = await ok(supabase.from('materiali').insert({ codice: f.codice, descrizione: f.descrizione, categoria: f.categoria, ...comuni }).select('id').single())
          id = m.id; colonna = 'materiale_id'
        }
        // giacenza iniziale = un carico con causale "inventario" (resta tracciato nello storico)
        if (+f.quantita_iniziale > 0) {
          await ok(supabase.from('movimenti').insert({ [colonna]: id, tipo: 'carico', quantita: +f.quantita_iniziale, causale: 'inventario', note: 'Giacenza iniziale', data: oggi() }))
        }
      }
      setForm(null); carica()
    } catch (e) {
      setErrore(e.message.includes('duplicate') ? 'Codice o variante già esistente.' : e.message)
    }
  }

  async function elimina(r) {
    if (!confirm(`Eliminare ${r.descrizione} (${r.codice})?`)) return
    try {
      await ok(supabase.from(r.tipo === 'profumo' ? 'varianti' : 'materiali').delete().eq('id', r.id))
      carica()
    } catch (e) {
      setErrore(e.message.includes('foreign key') ? 'Impossibile eliminare: l\'articolo ha movimenti registrati.' : e.message)
    }
  }

  const esporta = () => scaricaCSV(`giacenze_${oggi()}.csv`, filtrate.map((r) => ({
    Codice: r.codice, Descrizione: r.descrizione, Categoria: r.categoria, 'Capacità ml': r.capacita_ml ?? '',
    Quantità: r.quantita, Ubicazione: r.ubicazione ?? '', 'Soglia minima': r.soglia_min, 'Sotto soglia': r.sotto_soglia ? 'SÌ' : '', Note: r.note ?? '' })))

  return (
    <>
      <div className="barra">
        <div className="ricerca"><Icon n="search" /><input type="search" placeholder="Cerca per nome o codice" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="secondario" onClick={() => setScan(true)}><Icon n="scan" />Scansiona</button>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {CATEGORIE.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={cap} onChange={(e) => setCap(e.target.value)}>
          <option value="">Tutte le capacità</option>
          {[28, 50, 75].map((c) => <option key={c} value={c}>{c} ml</option>)}
        </select>
        <button className="secondario" onClick={esporta}><Icon n="download" />Esporta CSV</button>
        {admin && <button onClick={() => setForm({ ...VUOTO })}><Icon n="plus" />Nuovo articolo</button>}
      </div>
      {errore && <p className="errore">{errore}</p>}

      {profumi.length > 0 && (
        <section className="griglia">
          {profumi.map((p) => (
            <article className="prodotto" key={p.id}>
              <Thumb src={p.img} nome={p.nome} />
              <div className="corpo">
                <h3>{p.nome}</h3>
                {p.varianti.map((v) => (
                  <div key={v.id} className={'variante' + (v.sotto_soglia ? ' sotto' : '')}>
                    <b>{v.capacita_ml} ml</b>
                    <small>{v.codice}{v.ubicazione ? ` · ${v.ubicazione}` : ''}</small>
                    <span className="qta">{v.quantita}{v.sotto_soglia && <span className="badge">scorta</span>}</span>
                    {admin && <span className="azioni">
                      <button className="secondario piccolo" onClick={() => setForm({ ...v, immagine_url: p.img || '', quantita_iniziale: 0 })}>Modifica</button>
                      <button className="pericolo piccolo" onClick={() => elimina(v)}>Elimina</button>
                    </span>}
                  </div>
                ))}
                {admin && <button className="secondario piccolo" onClick={() => setForm({ ...VUOTO, descrizione: p.nome, immagine_url: p.img || '' })}>+ capacità</button>}
              </div>
            </article>
          ))}
        </section>
      )}

      {materiali.length > 0 && (
        <>
          <h2>Materiali e accessori</h2>
          <div className="tabella-wrap">
            <table>
              <thead><tr><th>Codice</th><th>Descrizione</th><th className="num">Giacenza</th><th>Ubicazione</th><th className="num">Min</th>{admin && <th />}</tr></thead>
              <tbody>
                {materiali.map((r) => (
                  <tr key={r.id} className={r.sotto_soglia ? 'sotto' : ''}>
                    <td>{r.codice}</td>
                    <td>{r.descrizione}<small> {r.categoria}</small>{r.sotto_soglia && <span className="badge">sotto scorta</span>}</td>
                    <td className="num"><b>{r.quantita}</b></td><td>{r.ubicazione}</td><td className="num">{r.soglia_min}</td>
                    {admin && <td className="azioni">
                      <button className="secondario piccolo" onClick={() => setForm({ ...r, quantita_iniziale: 0 })}>Modifica</button>
                      <button className="pericolo piccolo" onClick={() => elimina(r)}>Elimina</button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {filtrate.length === 0 && <p className="vuoto">Nessun articolo trovato.</p>}

      {scan && <Scanner onChiudi={() => setScan(false)} onCodice={(c) => { setQ(c); setScan(false) }} />}
      {form && <Modulo f={form} onSalva={salva} onChiudi={() => setForm(null)} />}
    </>
  )
}

function Modulo({ f, onSalva, onChiudi }) {
  const [v, setV] = useState(f)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const nuovo = !v.id
  const tipoProfumo = v.tipo === 'profumo'
  return (
    <div className="modale">
      <form className="scheda" onSubmit={(e) => { e.preventDefault(); onSalva(v) }}>
        <h3>{nuovo ? 'Nuovo articolo' : 'Modifica articolo'}</h3>
        {nuovo && (
          <label>Tipo
            <select value={v.tipo} onChange={set('tipo')}>
              <option value="profumo">Profumo (SKU per capacità)</option>
              <option value="materiale">Materiale / accessorio</option>
            </select>
          </label>
        )}
        <label>{tipoProfumo ? 'Nome profumo' : 'Descrizione'}<input value={v.descrizione} onChange={set('descrizione')} required /></label>
        <label>{tipoProfumo ? 'Codice SKU' : 'Codice'}<input value={v.codice} onChange={set('codice')} required /></label>
        {tipoProfumo
          ? <label>Capacità<select value={v.capacita_ml} onChange={set('capacita_ml')}>{[28, 50, 75].map((c) => <option key={c} value={c}>{c} ml</option>)}</select></label>
          : <label>Categoria<select value={v.categoria} onChange={set('categoria')}>{CATEGORIE.slice(1).map((c) => <option key={c}>{c}</option>)}</select></label>}
        {tipoProfumo && <label>Immagine (link o percorso, es. /prodotti/pax.png)<input value={v.immagine_url || ''} onChange={set('immagine_url')} /></label>}
        <label>Ubicazione (scaffale)<input value={v.ubicazione || ''} onChange={set('ubicazione')} /></label>
        <label>Soglia minima<input type="number" min="0" value={v.soglia_min} onChange={set('soglia_min')} /></label>
        {nuovo && <label>Giacenza iniziale<input type="number" min="0" value={v.quantita_iniziale} onChange={set('quantita_iniziale')} /></label>}
        <label>Note<textarea value={v.note || ''} onChange={set('note')} /></label>
        {!nuovo && tipoProfumo && <small>Il nome vale per tutte le capacità dello stesso profumo. La giacenza si cambia solo con un movimento.</small>}
        <div className="azioni"><button>Salva</button><button type="button" className="secondario" onClick={onChiudi}>Annulla</button></div>
      </form>
    </div>
  )
}
