
class AudioService {
  private static instance: AudioService;
  private bgm: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.4;
  private currentTrackIndex: number = 0;
  private synth: SpeechSynthesis = window.speechSynthesis;

  private tracks = [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  ];

  private sounds: Record<string, HTMLAudioElement> = {
    card_play: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),
    card_draw: new Audio('https://assets.mixkit.co/active_storage/sfx/2007/2007-preview.mp3'),
    uno_shout: new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'),
    win_fanfare: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
    lose: new Audio('https://assets.mixkit.co/active_storage/sfx/2502/2502-preview.mp3'),
    click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    penalty: new Audio('https://assets.mixkit.co/active_storage/sfx/2510/2510-preview.mp3'),
    tick: new Audio('https://assets.mixkit.co/active_storage/sfx/2550/2550-preview.mp3'),
    voice_skip: new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'),
    voice_wild: new Audio('https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3')
  };

  private constructor() {
    this.bgm = new Audio(this.tracks[0]);
    this.bgm.loop = true;
    this.updateVolumes();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) AudioService.instance = new AudioService();
    return AudioService.instance;
  }

  private updateVolumes() {
    if (this.bgm) this.bgm.volume = this.isMuted ? 0 : this.volume * 0.4;
    Object.values(this.sounds).forEach(s => s.volume = this.isMuted ? 0 : this.volume);
  }

  public startMusic() {
    if (this.isMuted) return;
    this.bgm?.play().catch(() => console.log("Interação necessária"));
  }

  public setVolume(val: number) {
    this.volume = val;
    this.updateVolumes();
  }

  public getVolume() { return this.volume; }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    const wasPlaying = !this.bgm?.paused;
    if (this.bgm) {
      this.bgm.src = this.tracks[this.currentTrackIndex];
      if (wasPlaying && !this.isMuted) this.bgm.play();
    }
  }

  public speak(text: string) {
    if (this.isMuted || !text) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    this.synth.speak(utterance);
  }

  public play(sound: keyof typeof this.sounds) {
    const sfx = this.sounds[sound];
    if (sfx) {
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.bgm?.pause();
      this.synth.cancel();
    } else {
      this.bgm?.play();
    }
    this.updateVolumes();
    return this.isMuted;
  }

  public getMuteStatus() { return this.isMuted; }
}

export const audio = AudioService.getInstance();
