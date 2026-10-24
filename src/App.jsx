// Applicazione principale: login, ruolo dell'utente e navigazione (menu laterale su PC, barra in basso su telefono)
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Logo from './components/Logo'
import Icon from './components/Icon'
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
  const voci = [['dashboard', 'Panoramica', 'home'], ['articoli', 'Articoli', 'box'], ['movimenti', 'Movimenti', 'swap'], ['storico', 'Storico', 'clock'], ...(admin ? [['utenti', 'Utenti', 'users']] : [])]

  return (
    <div className="shell">
      <aside>
        <Logo />
        <nav>
          {voci.map(([k, etichetta, icona]) => (
            <button key={k} className={pagina === k ? 'attivo' : ''} onClick={() => setPagina(k)}>
              <Icon n={icona} size={20} /><span>{etichetta}</span>
            </button>
          ))}
        </nav>
        <div className="profilo">
          <span className="avatar">{profilo.nome.slice(0, 1).toUpperCase()}</span>
          <span className="chi">{profilo.nome}<small>{profilo.ruolo}</small></span>
          <button className="icona" title="Esci" aria-label="Esci" onClick={() => supabase.auth.signOut()}><Icon n="logout" /></button>
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
