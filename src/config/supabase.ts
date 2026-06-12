const supabaseConfig = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
}

export const getSupabaseConfig = () => {
  if (!supabaseConfig.url || !supabaseConfig.serviceKey) {
    throw new Error(
      'Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.'
    )
  }
  return supabaseConfig
}

export default supabaseConfig
