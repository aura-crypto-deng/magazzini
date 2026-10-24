import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { giorniFa, formatoOra } from '../lib/utils'
import Icon from '../components/Icon'

export default function Dashboard({ vai, nome }) {
  const [articoli, setArticoli] = useState([])
  const [mov, setMov] = useState([])

  useEffect(() => {
    ;(async () => {
      const [a, m] = await Promise.all([
        supabase.from('v_articoli').select('*'),
        supabase.from('v_movimenti').select('*').gte('data', giorniFa(29)).order('creato_il', { ascending: false }),
      ])
      setArticoli(a.data || [])
      setMov(m.data || [])
    })()
  }, [])

  const sotto = articoli.filter((a) => a.sotto_soglia)
  // Dati del grafico: carichi e scarichi per ciascuno degli ultimi 30 giorni
  const giorni = [...Array(30)].map((_, i) => giorniFa(29 - i))
  const serie = giorni.map((g) => ({
    g,
    c: mov.filter((x) => x.data === g && x.tipo === 'carico').reduce((s, x) => s + x.quantita, 0),
    s: mov.filter((x) => x.data === g && x.tipo === 'scarico').reduce((s, x) => s + x.quantita, 0),
  }))
  const max = Math.max(1, ...serie.map((d) => Math.max(d.c, d.s)))

  return (
    <>
      <p className="saluto">Ciao {nome}, ecco lo stato del magazzino.</p>
      <section className="riepilogo">
        <div className="stat"><span className="ico"><Icon n="box" size={20} /></span><b>{articoli.length}</b><span>SKU in anagrafica</span></div>
        <div className={'stat' + (sotto.length ? ' allarme' : '')}><span className="ico"><Icon n="alert" size={20} /></span><b>{sotto.length}</b><span>sotto scorta</span></div>
        <div className="stat"><span className="ico"><Icon n="flask" size={20} /></span><b>{articoli.filter((a) => a.tipo === 'profumo').reduce((s, a) => s + a.quantita, 0)}</b><span>flaconi a magazzino</span></div>
      </section>

      <section className="pannello">
        <h2>Movimenti degli ultimi 30 giorni</h2>
        <svg viewBox="0 0 300 100" className="grafico" role="img" aria-label="Carichi e scarichi giornalieri">
          {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1="0" x2="300" y1={90 - f * 80} y2={90 - f * 80} className="griglia-linea" />)}
          {serie.map((d, i) => (
            <g key={d.g}>
              <title>{`${d.g}: carichi ${d.c}, scarichi ${d.s}`}</title>
              <rect x={i * 10 + 1} y={90 - (d.c / max) * 80} width="4" height={(d.c / max) * 80} rx="1.5" className="barra-carico" />
              <rect x={i * 10 + 5} y={90 - (d.s / max) * 80} width="4" height={(d.s / max) * 80} rx="1.5" className="barra-scarico" />
            </g>
          ))}
        </svg>
        <p className="legenda"><i className="barra-carico" /> Carichi <i className="barra-scarico" /> Scarichi</p>
      </section>

      <div className="duecol">
        <section className="pannello">
          <h2>Sotto scorta</h2>
          {sotto.length === 0 ? <p className="vuoto">Tutto sopra la soglia minima.</p> : (
            <ul className="lista">
              {sotto.map((a) => (
                <li key={a.id}>
                  <span className="testo">{a.descrizione}{a.capacita_ml ? ` · ${a.capacita_ml} ml` : ''}<small>{a.codice}</small></span>
                  <span className="badge">{a.quantita} / min {a.soglia_min}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pannello">
          <h2>Ultimi movimenti</h2>
          {mov.length === 0 ? <p className="vuoto">Nessun movimento negli ultimi 30 giorni.</p> : (
            <ul className="lista">
              {mov.slice(0, 7).map((m) => (
                <li key={m.id}>
                  <span className={'freccia ' + m.tipo}><Icon n={m.tipo === 'carico' ? 'down' : 'up'} /></span>
                  <span className="testo">{m.descrizione}{m.capacita_ml ? ` · ${m.capacita_ml} ml` : ''}<small>{m.causale} · {m.utente} · {formatoOra(m.creato_il)}</small></span>
                  <b className={m.tipo}>{m.tipo === 'carico' ? '+' : '−'}{m.quantita}</b>
                </li>
              ))}
            </ul>
          )}
          <button className="secondario" onClick={() => vai('movimenti')}><Icon n="plus" />Registra un movimento</button>
        </section>
      </div>
    </>
  )
}
