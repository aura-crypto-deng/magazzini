// Client Supabase: legge URL e chiave pubblica dalle variabili d'ambiente (.env / Vercel)
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Lancia l'errore di Supabase (se c'è) e restituisce i dati: semplifica i try/catch
export async function ok(promessa) {
  const { data, error } = await promessa
  if (error) throw error
  return data
}
