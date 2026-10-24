// Storico movimenti con filtri ed export CSV
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { giorniFa, oggi, formatoData, formatoOra, scaricaCSV } from '../lib/utils'

export default function Storico() {
  const [f, setF] = useState({ da: giorniFa(30), a: oggi(), q: '', utente: '', tipo: '' })
  const [righe, setRighe] = useState([])
  const [utenti, setUtenti] = useState([])
  const [errore, setErrore] = useState('')

  useEffect(() => { supabase.from('profili').select('id,nome').order('nome').then(({ data }) => setUtenti(data || [])) }, [])

  useEffect(() => {
    ;(async () => {
      let r = supabase.from('v_movimenti').select('*').order('creato_il', { ascending: false }).limit(2000)
      if (f.da) r = r.gte('data', f.da)
      if (f.a) r = r.lte('data', f.a)
      if (f.tipo) r = r.eq('tipo', f.tipo)
      if (f.utente) r = r.eq('utente_id', f.utente)
      const t = f.q.replace(/[,()%*]/g, ' ').trim()
      if (t) r = r.or(`descrizione.ilike.%${t}%,codice.ilike.%${t}%`)
      const { data, error } = await r
      setErrore(error?.message || '')
      setRighe(data || [])
    })()
  }, [f])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const esporta = () => scaricaCSV(`movimenti_${oggi()}.csv`, righe.map((m) => ({
    Data: formatoData(m.data), 'Registrato il': formatoOra(m.creato_il), Tipo: m.tipo, Codice: m.codice, Articolo: m.descrizione,
    'Capacità ml': m.capacita_ml ?? '', Quantità: m.quantita, Causale: m.causale, Utente: m.utente, Note: m.note ?? '' })))

  return (
    <>
      <div className="barra">
        <label>Dal<input type="date" value={f.da} onChange={set('da')} /></label>
        <label>Al<input type="date" value={f.a} onChange={set('a')} /></label>
        <div className="ricerca"><Icon n="search" /><input type="search" placeholder="Articolo o codice" value={f.q} onChange={set('q')} /></div>
        <select value={f.tipo} onChange={set('tipo')}><option value="">Carichi e scarichi</option><option value="carico">Solo carichi</option><option value="scarico">Solo scarichi</option></select>
        <select value={f.utente} onChange={set('utente')}><option value="">Tutti gli utenti</option>{utenti.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
        <button className="secondario" onClick={esporta}><Icon n="download" />Esporta CSV</button>
      </div>
      {errore && <p className="errore">{errore}</p>}
      <div className="tabella-wrap">
        <table>
          <thead><tr><th>Data</th><th>Articolo</th><th>Tipo</th><th className="num">Qtà</th><th>Causale</th><th>Utente</th><th>Note</th></tr></thead>
          <tbody>
            {righe.map((m) => (
              <tr key={m.id}>
                <td>{formatoData(m.data)}<small> {formatoOra(m.creato_il).slice(-5)}</small></td>
                <td>{m.descrizione}{m.capacita_ml ? ` ${m.capacita_ml} ml` : ''}<small> {m.codice}</small></td>
                <td className={m.tipo}>{m.tipo}</td><td className="num">{m.quantita}</td><td>{m.causale}</td><td>{m.utente}</td><td>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {righe.length === 0 && <p className="vuoto">Nessun movimento nel periodo.</p>}
      </div>
    </>
  )
}
