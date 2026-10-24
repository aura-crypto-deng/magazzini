// Registrazione di carichi e scarichi. La giacenza la aggiorna il database (trigger).
// Layout: a sinistra si sceglie l'articolo, a destra si compilano i dettagli.
import { useEffect, useRef, useState } from 'react'
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
  const [invio, setInvio] = useState(false)
  const dettagli = useRef(null)

  const carica = async () =>
    setArt((await supabase.from('v_articoli').select('*').order('descrizione').order('capacita_ml')).data || [])
  useEffect(() => { carica() }, [])

  const articolo = art.find((a) => a.id === sel)
  const trovati = art.filter((a) => !q || `${a.descrizione} ${a.codice}`.toLowerCase().includes(q.toLowerCase()))
  const n = Math.max(0, parseInt(quantita) || 0)
  const eccede = articolo && tipo === 'scarico' && n > articolo.quantita
  const dopo = articolo ? articolo.quantita + (tipo === 'carico' ? n : -n) : null

  function cambiaTipo(t) { setTipo(t); setCausale(CAUSALI[t][0]) }

  function scegli(id) {
    setSel(id); setMsg(null)
    // su telefono porta in vista i dettagli
    if (window.innerWidth <= 860) setTimeout(() => dettagli.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  function daScansione(codice) {
    setScan(false)
    const trovato = art.find((a) => a.codice.toLowerCase() === codice.toLowerCase())
    if (trovato) { setQ(''); scegli(trovato.id) }
    else { setQ(codice); setMsg({ ok: false, t: `Nessun articolo con codice ${codice}` }) }
  }

  async function registra(e) {
    e.preventDefault()
    setMsg(null)
    if (!articolo) return setMsg({ ok: false, t: 'Seleziona un articolo.' })
    if (n < 1) return setMsg({ ok: false, t: 'La quantità deve essere almeno 1.' })
    if (eccede) return setMsg({ ok: false, t: `Giacenza insufficiente: disponibili ${articolo.quantita}.` })
    setInvio(true)
    const colonna = articolo.tipo === 'profumo' ? 'variante_id' : 'materiale_id'
    const { error } = await supabase.from('movimenti').insert({ [colonna]: articolo.id, tipo, quantita: n, data, causale, note: note || null })
    setInvio(false)
    if (error) return setMsg({ ok: false, t: error.message })
    setMsg({ ok: true, t: `Registrato: ${tipo} di ${n} × ${articolo.descrizione}${articolo.capacita_ml ? ` ${articolo.capacita_ml} ml` : ''}.` })
    setSel(''); setQuantita(1); setNote(''); carica()
  }

  return (
    <div className="mov-grid">
      <section className="pannello">
        <h2><span className="passo">1</span>Scegli l'articolo</h2>
        <div className="barra">
          <div className="ricerca"><Icon n="search" /><input type="search" placeholder="Cerca per nome o codice" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button type="button" className="secondario" onClick={() => setScan(true)}><Icon n="scan" />Scansiona</button>
        </div>
        <div className="elenco-art">
          {trovati.map((a) => (
            <button type="button" key={a.id} className={'riga-art' + (a.id === sel ? ' attivo' : '')} onClick={() => scegli(a.id)}>
              <Thumb src={a.immagine_url} nome={a.descrizione} />
              <span className="testo">
                {a.descrizione}{a.capacita_ml ? <em>{a.capacita_ml} ml</em> : null}
                <small>{a.codice}{a.ubicazione ? ` · ${a.ubicazione}` : ''}</small>
              </span>
              <span className={'qta' + (a.sotto_soglia ? ' sotto' : '')}>{a.quantita}</span>
            </button>
          ))}
          {trovati.length === 0 && <p className="vuoto">Nessun articolo trovato.</p>}
        </div>
      </section>

      <form className="pannello" ref={dettagli} onSubmit={registra}>
        <h2><span className="passo">2</span>Dettagli del movimento</h2>
        <div className="interruttore">
          <button type="button" className={tipo === 'scarico' ? 'attivo' : ''} onClick={() => cambiaTipo('scarico')}><Icon n="up" />Scarico (uscita)</button>
          <button type="button" className={tipo === 'carico' ? 'attivo' : ''} onClick={() => cambiaTipo('carico')}><Icon n="down" />Carico (entrata)</button>
        </div>

        {articolo ? (
          <div className="selezionato">
            <Thumb src={articolo.immagine_url} nome={articolo.descrizione} />
            <div>
              <b>{articolo.descrizione}{articolo.capacita_ml ? ` · ${articolo.capacita_ml} ml` : ''}</b>
              <small>{articolo.codice}{articolo.ubicazione ? ` · ${articolo.ubicazione}` : ''}</small>
              <p className={articolo.sotto_soglia ? 'errore' : 'info'}>Giacenza attuale: <b>{articolo.quantita}</b>{dopo !== null && n > 0 && !eccede && <> → dopo il movimento: <b>{dopo}</b></>}</p>
            </div>
          </div>
        ) : <p className="segnaposto-sel">Scegli un articolo dall'elenco.</p>}

        <label>Quantità
          <div className="stepper">
            <button type="button" className="secondario" onClick={() => setQuantita(Math.max(1, n - 1))} aria-label="Diminuisci">−</button>
            <input type="number" min="1" inputMode="numeric" value={quantita} onChange={(e) => setQuantita(e.target.value)} required />
            <button type="button" className="secondario" onClick={() => setQuantita(n + 1)} aria-label="Aumenta">+</button>
          </div>
        </label>
        {eccede && <p className="errore">Stai scaricando più della giacenza ({articolo.quantita}): il movimento verrebbe rifiutato.</p>}

        <div className="campo">Causale
          <div className="chips">
            {CAUSALI[tipo].map((c) => <button type="button" key={c} className={'chip' + (causale === c ? ' attivo' : '')} onClick={() => setCausale(c)}>{c}</button>)}
          </div>
        </div>
        <label>Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} required /></label>
        <label>Note (facoltative)<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>

        {msg && <p className={'avviso ' + (msg.ok ? 'ok' : 'err')}>{msg.t}</p>}
        <button className="grande" disabled={!articolo || eccede || invio}>{invio ? 'Registrazione…' : `Registra ${tipo}`}</button>
      </form>

      {scan && <Scanner onChiudi={() => setScan(false)} onCodice={daScansione} />}
    </div>
  )
}
