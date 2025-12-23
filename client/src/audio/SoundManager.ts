/**
 * Simple sound manager for game audio effects
 */

// Sound effect paths
const SOUNDS = {
  hadouken: '/assets/sf2/sound/Hadouken sound.mp3',
} as const;

type SoundName = keyof typeof SOUNDS;

// Audio cache
const audioCache: Map<SoundName, HTMLAudioElement> = new Map();

// Global volume for sound effects (0-1)
const EFFECT_VOLUME = 0.15; // Low background volume

// Audio start offset to skip silence at beginning (in seconds)
const AUDIO_OFFSETS: Partial<Record<SoundName, number>> = {
  hadouken: 0.7, // Skip initial silence for instant playback
};

/**
 * Preload a sound effect
 */
export function preloadSound(name: SoundName): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audioCache.has(name)) {
      resolve();
      return;
    }

    const audio = new Audio(SOUNDS[name]);
    audio.preload = 'auto';
    audio.volume = EFFECT_VOLUME;

    audio.addEventListener('canplaythrough', () => {
      audioCache.set(name, audio);
      resolve();
    }, { once: true });

    audio.addEventListener('error', (e) => {
      console.warn(`Failed to load sound: ${name}`, e);
      reject(e);
    }, { once: true });

    // Start loading
    audio.load();
  });
}

/**
 * Play a sound effect
 */
export function playSound(name: SoundName): void {
  const cached = audioCache.get(name);

  if (cached) {
    // Clone the audio for overlapping sounds
    const audio = cached.cloneNode() as HTMLAudioElement;
    audio.volume = EFFECT_VOLUME;

    // Apply start offset to skip silence
    const offset = AUDIO_OFFSETS[name] || 0;
    audio.currentTime = offset;

    audio.play().catch(err => {
      // Ignore autoplay restrictions - user needs to interact first
      if (err.name !== 'NotAllowedError') {
        console.warn(`Failed to play sound: ${name}`, err);
      }
    });
  } else {
    // Not preloaded, load and play
    const audio = new Audio(SOUNDS[name]);
    audio.volume = EFFECT_VOLUME;

    // Apply start offset to skip silence
    const offset = AUDIO_OFFSETS[name] || 0;
    audio.currentTime = offset;

    audio.play().catch(err => {
      if (err.name !== 'NotAllowedError') {
        console.warn(`Failed to play sound: ${name}`, err);
      }
    });

    // Cache for next time
    audioCache.set(name, audio);
  }
}

/**
 * Preload all game sounds
 */
export function preloadAllSounds(): Promise<void[]> {
  return Promise.all(
    Object.keys(SOUNDS).map(name => preloadSound(name as SoundName))
  );
}
