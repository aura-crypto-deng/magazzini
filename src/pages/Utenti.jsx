// Gestione ruoli e nomi (solo admin). Le credenziali si creano da Supabase > Authentication.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Utenti({ io }) {
  const [utenti, setUtenti] = useState([])
  const [errore, setErrore] = useState('')
  const carica = async () => setUtenti((await supabase.from('profili').select('*').order('nome')).data || [])
  useEffect(() => { carica() }, [])

  async function aggiorna(id, campi) {
    const { error } = await supabase.from('profili').update(campi).eq('id', id)
    setErrore(error?.message || '')
    carica()
  }

  return (
    <>
      <h2>Utenti</h2>
      <p className="info">Per aggiungere una persona crea l'utente da Supabase (Authentication → Users → Add user): comparirà qui come operatore.</p>
      {errore && <p className="errore">{errore}</p>}
      <ul className="lista">
        {utenti.map((u) => (
          <li key={u.id}>
            <input defaultValue={u.nome} onBlur={(e) => e.target.value !== u.nome && aggiorna(u.id, { nome: e.target.value })} />
            <select value={u.ruolo} disabled={u.id === io} onChange={(e) => aggiorna(u.id, { ruolo: e.target.value })}>
              <option value="operatore">operatore</option><option value="admin">admin</option>
            </select>
          </li>
        ))}
      </ul>
    </>
  )
}
