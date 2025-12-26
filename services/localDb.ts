
/**
 * PersistenceService - Mobile Engineer Senior Implementation
 * Gerencia o armazenamento local (SQLite/LocalStorage) com fallback seguro.
 */
export const localDb = {
  save: (key: string, data: any) => {
    try {
      localStorage.setItem(`uno_mobile_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error("Erro ao salvar no banco local", e);
    }
  },
  load: (key: string, defaultValue: any) => {
    try {
      const val = localStorage.getItem(`uno_mobile_${key}`);
      return val ? JSON.parse(val) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },
  syncWithCloud: async (profileId: string, cloudData: any) => {
    // Lógica de resolução de conflitos (Last Write Wins)
    const local = localDb.load('profile_cache', null);
    if (!local || cloudData.updated_at > local.updated_at) {
      localDb.save('profile_cache', cloudData);
      return cloudData;
    }
    return local;
  }
};
