// Applicazione principale: gestisce login, ruolo dell'utente e navigazione tra le pagine
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Articoli from './pages/Articoli'
import Movimenti from './pages/Movimenti'
import Storico from './pages/Storico'
import Utenti from './pages/Utenti'

export default function App() {
  const [sessione, setSessione] = useState(undefined) // undefined = sto ancora controllando
  const [profilo, setProfilo] = useState(null)
  const [pagina, setPagina] = useState('dashboard')

  // 1) Ascolta i cambiamenti di autenticazione. Il callback deve essere SINCRONO:
  //    niente await/query Supabase qui dentro, altrimenti il client va in deadlock.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // 2) Recupera il profilo quando cambia la sessione, FUORI dal callback di auth
  useEffect(() => {
    if (!sessione) {
      setProfilo(null)
      return
    }

    let cancelled = false
    supabase
      .from('profili')
      .select('*')
      .eq('id', sessione.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Errore nel recupero del profilo:', error)
          setProfilo(null)
        } else {
          setProfilo(data)
        }
      })

    return () => { cancelled = true }
  }, [sessione])

  if (sessione === undefined) return <p className="centro">Caricamento…</p>
  if (!sessione) return <Login />
  if (!profilo) return <p className="centro">Caricamento profilo…</p>

  const admin = profilo.ruolo === 'admin'
  const voci = [
    ['dashboard', 'Dashboard'], ['articoli', 'Articoli'], ['movimenti', 'Movimenti'], ['storico', 'Storico'],
    ...(admin ? [['utenti', 'Utenti']] : []),
  ]

  return (
    <div className="app">
      <header>
        <strong className="marchio">Lorenzo Pazzaglia Parfum</strong>
        <span className="utente">{profilo.nome} · {profilo.ruolo}</span>
        <button className="secondario piccolo" onClick={() => supabase.auth.signOut()}>Esci</button>
      </header>
      <nav>
        {voci.map(([k, etichetta]) => (
          <button key={k} className={pagina === k ? 'attivo' : ''} onClick={() => setPagina(k)}>{etichetta}</button>
        ))}
      </nav>
      <main>
        {pagina === 'dashboard' && <Dashboard vai={setPagina} />}
        {pagina === 'articoli' && <Articoli admin={admin} />}
        {pagina === 'movimenti' && <Movimenti />}
        {pagina === 'storico' && <Storico />}
        {pagina === 'utenti' && admin && <Utenti io={profilo.id} />}
      </main>
    </div>
  )
}