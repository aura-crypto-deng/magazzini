import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { giorniFa, formatoOra } from '../lib/utils'

export default function Dashboard({ vai }) {
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
      <section className="riepilogo">
        <div><b>{articoli.length}</b><span>SKU in anagrafica</span></div>
        <div className={sotto.length ? 'allarme' : ''}><b>{sotto.length}</b><span>sotto scorta</span></div>
        <div><b>{articoli.filter((a) => a.tipo === 'profumo').reduce((s, a) => s + a.quantita, 0)}</b><span>flaconi a magazzino</span></div>
      </section>

      <section>
        <h2>Movimenti degli ultimi 30 giorni</h2>
        <svg viewBox="0 0 300 90" className="grafico" role="img" aria-label="Carichi e scarichi giornalieri">
          {serie.map((d, i) => (
            <g key={d.g}>
              <title>{`${d.g}: carichi ${d.c}, scarichi ${d.s}`}</title>
              <rect x={i * 10 + 1} y={80 - (d.c / max) * 75} width="4" height={(d.c / max) * 75} className="barra-carico" />
              <rect x={i * 10 + 5} y={80 - (d.s / max) * 75} width="4" height={(d.s / max) * 75} className="barra-scarico" />
            </g>
          ))}
          <line x1="0" y1="80" x2="300" y2="80" stroke="currentColor" opacity=".3" />
        </svg>
        <p className="legenda"><i className="barra-carico" /> Carichi <i className="barra-scarico" /> Scarichi</p>
      </section>

      <section>
        <h2>Articoli sotto scorta</h2>
        {sotto.length === 0 ? <p className="vuoto">Tutto sopra soglia minima.</p> : (
          <ul className="lista">
            {sotto.map((a) => (
              <li key={a.id} className="sotto">
                <span>{a.descrizione}{a.capacita_ml ? ` ${a.capacita_ml} ml` : ''} <small>{a.codice}</small></span>
                <b>{a.quantita} / min {a.soglia_min}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Ultimi movimenti</h2>
        <ul className="lista">
          {mov.slice(0, 8).map((m) => (
            <li key={m.id}>
              <span>{m.descrizione}{m.capacita_ml ? ` ${m.capacita_ml} ml` : ''} <small>{m.causale} · {m.utente} · {formatoOra(m.creato_il)}</small></span>
              <b className={m.tipo}>{m.tipo === 'carico' ? '+' : '−'}{m.quantita}</b>
            </li>
          ))}
        </ul>
        <button className="secondario" onClick={() => vai('movimenti')}>Registra un movimento</button>
      </section>
    </>
  )
}
