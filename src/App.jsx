// Applicazione principale: login, ruolo dell'utente e navigazione (menu laterale su PC, barra in basso su telefono)
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Logo from './components/Logo'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Articoli from './pages/Articoli'
import Movimenti from './pages/Movimenti'
import Storico from './pages/Storico'
import Utenti from './pages/Utenti'

const TITOLI = { dashboard: 'Panoramica', articoli: 'Articoli', movimenti: 'Nuovo movimento', storico: 'Storico movimenti', utenti: 'Utenti' }

export default function App() {
  const [sessione, setSessione] = useState(undefined) // undefined = sto ancora controllando
  const [profilo, setProfilo] = useState(null)
  const [pagina, setPagina] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessione) return setProfilo(null)
    supabase.from('profili').select('*').eq('id', sessione.user.id).single().then(({ data }) => setProfilo(data))
  }, [sessione])

  if (sessione === undefined) return <p className="centro">Caricamento…</p>
  if (!sessione) return <Login />
  if (!profilo) return <p className="centro">Caricamento profilo…</p>

  const admin = profilo.ruolo === 'admin'
  const voci = [['dashboard', 'Panoramica'], ['articoli', 'Articoli'], ['movimenti', 'Movimenti'], ['storico', 'Storico'], ...(admin ? [['utenti', 'Utenti']] : [])]

  return (
    <div className="shell">
      <aside>
        <Logo />
        <nav>
          {voci.map(([k, etichetta]) => (
            <button key={k} className={pagina === k ? 'attivo' : ''} onClick={() => setPagina(k)}>{etichetta}</button>
          ))}
        </nav>
        <div className="profilo">
          <span>{profilo.nome}<small>{profilo.ruolo}</small></span>
          <button className="secondario piccolo" onClick={() => supabase.auth.signOut()}>Esci</button>
        </div>
      </aside>
      <main>
        <h1 className="titolo-pagina">{TITOLI[pagina]}</h1>
        {pagina === 'dashboard' && <Dashboard vai={setPagina} nome={profilo.nome} />}
        {pagina === 'articoli' && <Articoli admin={admin} />}
        {pagina === 'movimenti' && <Movimenti />}
        {pagina === 'storico' && <Storico />}
        {pagina === 'utenti' && admin && <Utenti io={profilo.id} />}
      </main>
    </div>
  )
}
