import { createBrowserClient } from "@supabase/ssr"
export function createClient() {
  return createBrowserClient(
    "https://igxogfgmzwdvrcyadyyb.supabase.co",
    "sb_publishable_FiZu69HmYlwR9531qt3iEw_fLlQ6B1r"
  )
}
