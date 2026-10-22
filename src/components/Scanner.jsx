// Scansione codice a barre / QR con la fotocamera (richiede HTTPS: su Vercel è automatico)
import { useEffect } from 'react'

export default function Scanner({ onCodice, onChiudi }) {
  useEffect(() => {
    let scanner
    let letto = false
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('lettore')
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 160 } },
          (testo) => { if (!letto) { letto = true; onCodice(testo.trim()) } },
          () => {}
        )
        .catch(() => { alert('Fotocamera non disponibile: controlla i permessi del browser.'); onChiudi() })
    })
    return () => { if (scanner?.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {}) }
  }, [])

  return (
    <div className="modale" onClick={onChiudi}>
      <div className="scheda" onClick={(e) => e.stopPropagation()}>
        <h3>Inquadra il codice</h3>
        <div id="lettore" />
        <button className="secondario" onClick={onChiudi}>Chiudi</button>
      </div>
    </div>
  )
}
