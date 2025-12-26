
import React, { useState, useRef } from 'react';
import { AppView, DailyMission } from '../types';
import { AVATARS } from '../constants';
import { localDb } from '../services/localDb';

interface ProfileProps {
  profile: any;
  missions: DailyMission[];
  onNavigate: (view: AppView) => void;
  onUpdateProfile: (updates: any) => void;
}

const Profile: React.FC<ProfileProps> = ({ profile, missions, onNavigate, onUpdateProfile }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [adjustingImage, setAdjustingImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdjustingImage(reader.result as string);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = () => {
    if (!canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400; 
    canvas.width = size;
    canvas.height = size;

    const previewSize = 256;
    const ratio = size / previewSize;
    const finalScale = fitScale * zoom * ratio;
    
    const drawWidth = imgRef.current.naturalWidth * finalScale;
    const drawHeight = imgRef.current.naturalHeight * finalScale;
    
    const centerX = size / 2 + position.x * ratio;
    const centerY = size / 2 + position.y * ratio;

    ctx.drawImage(imgRef.current, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
    onUpdateProfile({ photoUrl: croppedBase64 });
    setAdjustingImage(null);
  };

  return (
    <div className="flex-1 flex flex-col p-4 pb-20 animate-fade-in relative z-10 overflow-y-auto no-scrollbar bg-black">
      {/* Mobile Top Header */}
      <div className="flex justify-between items-center mb-6 pt-4 px-2">
         <h1 className="text-3xl font-brand text-white italic">DASHBOARD</h1>
         <div className="flex gap-2">
           <div className="bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">
             <span className="text-yellow-400 font-brand">🪙 {profile.coins}</span>
           </div>
         </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile Card Mobile */}
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-6">
          <div className="relative" onClick={() => setShowEditModal(true)}>
             <div className="w-24 h-24 rounded-full border-4 border-yellow-400 overflow-hidden shadow-2xl flex items-center justify-center text-5xl bg-yellow-500/20">
                {profile.photoUrl ? <img src={profile.photoUrl} className="w-full h-full object-cover" /> : profile.avatar}
             </div>
             <div className="absolute -bottom-1 -right-1 bg-blue-500 w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-xs">✏️</div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-brand text-white italic">{profile.name}</h2>
            <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest">{profile.rank}</p>
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-blue-500" style={{width: '40%'}}></div>
            </div>
          </div>
        </div>

        {/* Action Buttons Mobile Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate(AppView.LOBBY)} className="col-span-2 py-6 bg-yellow-500 text-emerald-950 font-brand text-2xl rounded-3xl shadow-lg active:scale-95 transition-all">JOGAR AGORA</button>
          <button onClick={() => onNavigate(AppView.STORE)} className="py-4 bg-white/5 border border-white/10 rounded-2xl font-brand text-sm italic">LOJA 🛒</button>
          <button onClick={() => onNavigate(AppView.RANKING)} className="py-4 bg-white/5 border border-white/10 rounded-2xl font-brand text-sm italic">RANK 🏆</button>
        </div>

        {/* Daily Missions Scrollable Mobile */}
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
           <h3 className="font-brand text-blue-400 mb-4 italic">MISSÕES DIÁRIAS</h3>
           <div className="space-y-4">
              {missions.map(m => (
                <div key={m.id} className="bg-black/20 p-4 rounded-2xl border border-white/5">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-[10px] font-bold text-white/70 uppercase">{m.description}</span>
                     <span className="text-yellow-400 text-xs font-brand">+{m.reward}</span>
                   </div>
                   <div className="w-full h-1 bg-white/10 rounded-full">
                      <div className="h-full bg-blue-400" style={{width: `${(m.current/m.target)*100}%`}}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/95 z-[500] flex flex-col p-6 animate-fade-in">
           <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-brand text-yellow-400 italic">EDITAR PERFIL</h2>
              <button onClick={() => setShowEditModal(false)} className="text-2xl">✕</button>
           </div>

           {adjustingImage ? (
             <div className="flex-1 flex flex-col items-center justify-center">
                <div 
                  className="w-64 h-64 rounded-full overflow-hidden border-4 border-yellow-400 bg-black relative cursor-move"
                  onMouseDown={(e) => { setIsDragging(true); setDragStart({x: e.clientX - position.x, y: e.clientY - position.y}); }}
                  onMouseMove={(e) => { if(isDragging) setPosition({x: e.clientX - dragStart.x, y: e.clientY - dragStart.y}); }}
                  onMouseUp={() => setIsDragging(false)}
                  onTouchStart={(e) => { setIsDragging(true); setDragStart({x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y}); }}
                  onTouchMove={(e) => { if(isDragging) setPosition({x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y}); }}
                  onTouchEnd={() => setIsDragging(false)}
                >
                  <img 
                    ref={imgRef}
                    src={adjustingImage}
                    onLoad={() => {
                      const {naturalWidth, naturalHeight} = imgRef.current!;
                      setFitScale(Math.max(256/naturalWidth, 256/naturalHeight));
                    }}
                    style={{
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${fitScale * zoom})`,
                      position: 'absolute', top: '50%', left: '50%', maxWidth: 'none'
                    }}
                  />
                </div>
                <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-full mt-10 accent-yellow-400" />
                <div className="flex gap-4 w-full mt-10">
                   <button onClick={() => setAdjustingImage(null)} className="flex-1 py-4 bg-white/10 rounded-xl font-brand">CANCELAR</button>
                   <button onClick={handleApplyCrop} className="flex-1 py-4 bg-yellow-500 text-black rounded-xl font-brand">SALVAR</button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
             </div>
           ) : (
             <div className="flex-1 space-y-10">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-32 h-32 rounded-full border-4 border-blue-500 flex items-center justify-center text-6xl">
                    {profile.avatar}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="py-4 px-10 bg-blue-600 rounded-2xl font-brand text-xs">MUDAR FOTO 📸</button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
                
                <div>
                   <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Escolha seu Avatar</h3>
                   <div className="grid grid-cols-4 gap-4">
                      {AVATARS.map(a => (
                        <button key={a} onClick={() => onUpdateProfile({avatar: a, photoUrl: null})} className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${profile.avatar === a && !profile.photoUrl ? 'bg-yellow-500' : 'bg-white/5'}`}>{a}</button>
                      ))}
                   </div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="w-full py-6 bg-yellow-500 text-black font-brand text-2xl rounded-3xl mt-auto">PRONTO</button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
    <span className="text-[8px] font-black uppercase text-white/30">{label}</span>
    <span className={`text-xl font-brand ${color}`}>{value}</span>
  </div>
);

export default Profile;
