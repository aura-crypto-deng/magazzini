// Data di oggi nel formato YYYY-MM-DD (fuso orario locale)
export const oggi = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const giorniFa = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const formatoData = (s) => (s ? s.split('-').reverse().join('/') : '')
export const formatoOra = (iso) =>
  new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

// Esporta righe in CSV. Separatore ";" + BOM UTF-8: Excel italiano lo apre direttamente.
export function scaricaCSV(nomeFile, righe) {
  if (!righe.length) return alert('Nessun dato da esportare')
  const colonne = Object.keys(righe[0])
  const cella = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const testo = '\ufeff' + [colonne.join(';'), ...righe.map((r) => colonne.map((c) => cella(r[c])).join(';'))].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([testo], { type: 'text/csv;charset=utf-8' }))
  a.download = nomeFile
  a.click()
  URL.revokeObjectURL(a.href)
}
