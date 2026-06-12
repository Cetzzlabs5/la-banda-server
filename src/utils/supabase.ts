import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '../config/supabase'

let supabaseInstance: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    const config = getSupabaseConfig()
    supabaseInstance = createClient(config.url, config.serviceKey)
  }
  return supabaseInstance
}
