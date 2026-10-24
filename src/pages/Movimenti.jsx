// Registrazione di carichi e scarichi. La giacenza la aggiorna il database (trigger).
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { oggi } from '../lib/utils'
import Scanner from '../components/Scanner'
import Thumb from '../components/Thumb'
import Icon from '../components/Icon'

const CAUSALI = {
  carico: ['acquisto', 'produzione', 'reso', 'inventario', 'altro'],
  scarico: ['vendita', 'omaggio', 'campione', 'produzione', 'inventario', 'altro'],
}

export default function Movimenti() {
  const [art, setArt] = useState([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState('')
  const [tipo, setTipo] = useState('scarico')
  const [quantita, setQuantita] = useState(1)
  const [data, setData] = useState(oggi())
  const [causale, setCausale] = useState('vendita')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState(null)
  const [scan, setScan] = useState(false)

  const carica = async () => setArt((await supabase.from('v_articoli').select('*').order('descrizione')).data || [])
  useEffect(() => { carica() }, [])

  const articolo = art.find((a) => a.id === sel)
  const opzioni = art.filter((a) => !q || `${a.descrizione} ${a.codice}`.toLowerCase().includes(q.toLowerCase())).slice(0, 100)
  const eccede = articolo && tipo === 'scarico' && +quantita > articolo.quantita

  function cambiaTipo(t) { setTipo(t); setCausale(CAUSALI[t][0]) }

  function daScansione(codice) {
    setScan(false)
    const trovato = art.find((a) => a.codice.toLowerCase() === codice.toLowerCase())
    if (trovato) { setSel(trovato.id); setQ(''); setMsg({ ok: true, t: `Trovato: ${trovato.descrizione}` }) }
    else { setQ(codice); setMsg({ ok: false, t: `Nessun articolo con codice ${codice}` }) }
  }

  async function registra(e) {
    e.preventDefault()
    setMsg(null)
    if (!articolo) return setMsg({ ok: false, t: 'Seleziona un articolo.' })
    if (eccede) return setMsg({ ok: false, t: `Giacenza insufficiente: disponibili ${articolo.quantita}.` })
    const colonna = articolo.tipo === 'profumo' ? 'variante_id' : 'materiale_id'
    const { error } = await supabase.from('movimenti').insert({ [colonna]: articolo.id, tipo, quantita: +quantita, data, causale, note: note || null })
    if (error) return setMsg({ ok: false, t: error.message })
    setMsg({ ok: true, t: `Registrato: ${tipo} di ${quantita} × ${articolo.descrizione}.` })
    setQuantita(1); setNote(''); carica()
  }

  return (
    <form className="modulo" onSubmit={registra}>
      <div className="interruttore">
        <button type="button" className={tipo === 'scarico' ? 'attivo' : ''} onClick={() => cambiaTipo('scarico')}><Icon n="up" />Scarico (uscita)</button>
        <button type="button" className={tipo === 'carico' ? 'attivo' : ''} onClick={() => cambiaTipo('carico')}><Icon n="down" />Carico (entrata)</button>
      </div>
      <label>Articolo
        <div className="barra">
          <div className="ricerca"><Icon n="search" /><input type="search" placeholder="Cerca per nome o codice" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button type="button" className="secondario" onClick={() => setScan(true)}><Icon n="scan" />Scansiona</button>
        </div>
        <select value={sel} onChange={(e) => setSel(e.target.value)} size={Math.min(6, opzioni.length + 1)}>
          <option value="">— scegli —</option>
          {opzioni.map((a) => <option key={a.id} value={a.id}>{a.descrizione}{a.capacita_ml ? ` ${a.capacita_ml} ml` : ''} · {a.codice} (giac. {a.quantita})</option>)}
        </select>
      </label>
      {articolo && (
        <div className="selezionato">
          <Thumb src={articolo.immagine_url} nome={articolo.descrizione} />
          <div>
            <b>{articolo.descrizione}{articolo.capacita_ml ? ` ${articolo.capacita_ml} ml` : ''}</b>
            <small>{articolo.codice}{articolo.ubicazione ? ` · ${articolo.ubicazione}` : ''}</small>
            <p className={articolo.sotto_soglia ? 'errore' : 'info'}>Giacenza attuale: <b>{articolo.quantita}</b></p>
          </div>
        </div>
      )}
      <label>Quantità<input type="number" min="1" value={quantita} onChange={(e) => setQuantita(e.target.value)} required /></label>
      {eccede && <p className="errore">Attenzione: stai scaricando più della giacenza ({articolo.quantita}). Il movimento verrà rifiutato.</p>}
      <label>Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} required /></label>
      <label>Causale<select value={causale} onChange={(e) => setCausale(e.target.value)}>{CAUSALI[tipo].map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Note<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {msg && <p className={msg.ok ? 'info' : 'errore'}>{msg.t}</p>}
      <button disabled={eccede}>Registra {tipo}</button>
      {scan && <Scanner onChiudi={() => setScan(false)} onCodice={daScansione} />}
    </form>
  )
}
