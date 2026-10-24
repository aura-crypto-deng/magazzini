// Immagine prodotto; se manca o non si carica mostra l'iniziale del nome
import { useState } from 'react'

export default function Thumb({ src, nome, className = '' }) {
  const [errore, setErrore] = useState(false)
  if (!src || errore) return <div className={'thumb segnaposto ' + className}>{(nome || '?').slice(0, 1)}</div>
  return <img className={'thumb ' + className} src={src} alt={nome} loading="lazy" onError={() => setErrore(true)} />
}
