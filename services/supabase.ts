
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uadxgxzyvsziyojpruwi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZHhneHp5dnN6aXlvanBydXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTk5MzcsImV4cCI6MjA4MjE5NTkzN30.Qv8U-Ilyzh-0ljcHtRBd-Lmyxr2vHSMmMLWxhUPY3X8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const syncProfile = async (profileId: string, profileData: any) => {
  if (!profileId || !profileData.name) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: profileId, 
        name: profileData.name,
        avatar: profileData.avatar,
        mmr: profileData.mmr,
        coins: profileData.coins,
        level: profileData.level,
        xp: profileData.xp,
        inventory: profileData.inventory,
        equipped_skin: profileData.equippedSkin,
        stats: profileData.stats,
        history: profileData.history,
        achievements: profileData.achievements,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) throw error;
    return data;
  } catch (e) {
    return null;
  }
};

export const fetchProfile = async (profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle(); // Uso do maybeSingle evita erro 406 se não houver dados
    
    if (error || !data) return null;

    return {
      ...data,
      equippedSkin: data.equipped_skin
    };
  } catch (e) {
    return null;
  }
};
