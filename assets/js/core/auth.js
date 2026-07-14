import { supabase } from "./supabase.js";
import APP_CONFIG from "./config.js";

export async function login(email,password){
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return { data:null, error };

  const { data: profile, error: profileError } = await supabase
    .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)
    .select("*, roles(*)")
    .eq("id", data.user.id)
    .single();

  return {
    data:{
      user:data.user,
      session:data.session,
      profile: profile ?? null
    },
    error: profileError ?? null
  };
}

export async function logout(){
  await supabase.auth.signOut();
  localStorage.removeItem(APP_CONFIG.AUTH.PROFILE_KEY);
}

export async function getSession(){
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser(){
  const { data } = await supabase.auth.getUser();
  return data.user;
}
