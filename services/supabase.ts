
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uadxgxzyvsziyojpruwi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZHhneHp5dnN6aXlvanBydXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTk5MzcsImV4cCI6MjA4MjE5NTkzN30.Qv8U-Ilyzh-0ljcHtRBd-Lmyxr2vHSMmMLWxhUPY3X8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const syncProfile = async (profileId: string, profileData: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: profileId, ...profileData }, { onConflict: 'id' });
    
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Erro ao sincronizar com Supabase:', e);
    return null;
  }
};

export const fetchProfile = async (profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
};
