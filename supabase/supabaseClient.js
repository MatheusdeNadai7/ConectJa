import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://umpufxwgaxgyhzhbjaep.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHVmeHdnYXhneWh6aGJqYWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzQ3ODIsImV4cCI6MjA2ODg1MDc4Mn0.US4LPmpLb0hSPPdlCz9RJS2V0vTZX_pFN-e9-ekgIcQ'
export const supabase = createClient(supabaseUrl, supabaseKey)
