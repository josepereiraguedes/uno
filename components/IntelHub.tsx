
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { audio } from '../services/audioService';

interface IntelHubProps {
  onBack: () => void;
}

const IntelHub: React.FC<IntelHubProps> = ({ onBack }) => {
  const [intelData, setIntelData] = useState<string>('');
  const [sources, setSources] = useState<{ uri: string, title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "Atue como um mestre de UNO Online e estrategista de jogos competitivos. Faça uma pesquisa sobre as melhores estratégias de UNO Online em 2024, tendências de decks e como gerenciar cartas de ação (+2, +4, skip) em ranks altos. Traga um relatório conciso com dicas práticas.",
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        setIntelData(response.text || 'Ocorreu um erro ao carregar os dados.');
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const extractedSources = chunks.filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
        setSources(extractedSources);
      } catch (error) {
        setIntelData("Conexão perdida. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    fetchIntel();
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[600] flex flex-col animate-fade-in">
      <div className="p-6 bg-black/60 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-xl">💡</div>
          <div>
            <h2 className="text-2xl font-brand text-yellow-400 italic">INTEL</h2>
            <p className="text-[8px] text-white/30 font-black uppercase tracking-widest">Rede Neural Gemini</p>
          </div>
        </div>
        <button onClick={() => { audio.play('click'); onBack(); }} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-10">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
             <div className="w-16 h-16 border-t-4 border-yellow-500 rounded-full animate-spin"></div>
             <p className="font-brand text-yellow-400 animate-pulse uppercase italic">Infiltrando...</p>
          </div>
        ) : (
          <div className="animate-slide-up space-y-8">
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 leading-relaxed text-sm text-white/80 whitespace-pre-wrap">
              {intelData}
            </div>
            {sources.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-brand text-blue-400 italic uppercase ml-2 text-sm">Fontes de Campo</h4>
                <div className="space-y-2">
                  {sources.map((src, i) => (
                    <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white/50 truncate max-w-[85%] uppercase">{src.title}</span>
                      <span className="text-yellow-500">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelHub;
