import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import APP_CONFIG from "./config.js";

export const supabase = createClient(
  APP_CONFIG.SUPABASE.URL,
  APP_CONFIG.SUPABASE.ANON_KEY,
  {
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    }
  }
);
