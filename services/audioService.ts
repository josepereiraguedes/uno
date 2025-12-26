
class AudioService {
  private static instance: AudioService;
  private bgm: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private currentTrackIndex: number = 0;

  private tracks = [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  ];

  private sounds: Record<string, HTMLAudioElement> = {};

  private constructor() {
    this.initSfx();
    this.initBgm();
  }

  private initSfx() {
    const sfxUrls: Record<string, string> = {
      card_play: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
      card_draw: 'https://assets.mixkit.co/active_storage/sfx/2007/2007-preview.mp3',
      uno_shout: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
      win_fanfare: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
      click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      penalty: 'https://assets.mixkit.co/active_storage/sfx/2510/2510-preview.mp3',
      hype: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
    };

    Object.entries(sfxUrls).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds[key] = audio;
    });
  }

  private initBgm() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.src = '';
    }
    this.bgm = new Audio();
    this.bgm.loop = true;
    this.bgm.preload = 'auto';
    this.bgm.src = this.tracks[this.currentTrackIndex];
    this.updateVolumes();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) AudioService.instance = new AudioService();
    return AudioService.instance;
  }

  private updateVolumes() {
    if (this.bgm) this.bgm.volume = this.isMuted ? 0 : this.volume * 0.2;
    Object.values(this.sounds).forEach(s => s.volume = this.isMuted ? 0 : this.volume);
  }

  public startMusic() {
    if (!this.bgm || this.isMuted) return;
    this.bgm.play().catch(() => {});
  }

  public stopMusic() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    this.updateVolumes();
  }

  public getVolume() { return this.volume; }

  public nextTrack() {
    if (!this.bgm) return;
    const wasPlaying = !this.bgm.paused;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.bgm.src = this.tracks[this.currentTrackIndex];
    if (wasPlaying && !this.isMuted) this.bgm.play().catch(() => {});
  }

  public play(sound: string) {
    const sfx = this.sounds[sound];
    if (sfx) {
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.bgm?.pause();
    else this.bgm?.play().catch(() => {});
    this.updateVolumes();
    return this.isMuted;
  }

  public getMuteStatus() { return this.isMuted; }
}

export const audio = AudioService.getInstance();
