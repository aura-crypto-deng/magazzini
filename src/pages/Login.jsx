import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  async function accedi(e) {
    e.preventDefault()
    setAttesa(true); setErrore('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrore('Email o password non corretti.')
    setAttesa(false)
  }

  return (
    <main className="login">
      <form onSubmit={accedi}>
        <h1>Lorenzo Pazzaglia Parfum</h1>
        <p>Magazzino interno</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {errore && <p className="errore">{errore}</p>}
        <button disabled={attesa}>{attesa ? 'Accesso in corso…' : 'Accedi'}</button>
      </form>
    </main>
  )
}
