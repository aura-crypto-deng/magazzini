// Logo: usa /public/logo.png se presente, altrimenti mostra solo il nome del marchio
import { useState } from 'react'

export default function Logo({ grande }) {
  const [manca, setManca] = useState(false)
  return (
    <div className={'logo' + (grande ? ' grande' : '')}>
      {!manca && <img src="/logo.png" alt="" onError={() => setManca(true)} />}
      <span>Lorenzo Pazzaglia<small>Magazzino</small></span>
    </div>
  )
}
