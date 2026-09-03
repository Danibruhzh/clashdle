// Every sound effect used anywhere in the app — kept in one place so
// preloadSounds() doesn't drift out of sync with what playSound() actually
// gets called with.
const SOUND_PATHS = ['/grabcard.mp3', '/flip%20sound.mp3', '/win%20sound.mp3']

// Safari < 14.1 only exposed this prefixed.
const AudioContextClass: typeof AudioContext =
  window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

// Applied to every sound effect in the app.
const MASTER_VOLUME = 0.1

// One shared context for the whole app, created lazily (not at module load)
// since constructing it before any user gesture just leaves it stuck
// "suspended" regardless.
let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContextClass()
  }
  return audioContext
}

// One shared GainNode every source routes through instead of straight to
// destination — a single volume knob for every sound, rather than setting
// it on each transient source node individually.
function getMasterGain(): GainNode {
  if (!masterGain) {
    const ctx = getAudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = MASTER_VOLUME
    masterGain.connect(ctx.destination)
  }
  return masterGain
}

// Each file is fetched and decoded into a raw AudioBuffer exactly once —
// cached by path so preloadSounds() and every later playSound() call for
// that same path share one decode instead of redoing it per play.
const bufferCache = new Map<string, Promise<AudioBuffer>>()

async function loadBuffer(path: string): Promise<AudioBuffer> {
  const response = await fetch(path)
  const arrayBuffer = await response.arrayBuffer()
  return getAudioContext().decodeAudioData(arrayBuffer)
}

function getBuffer(path: string): Promise<AudioBuffer> {
  let buffer = bufferCache.get(path)
  if (!buffer) {
    buffer = loadBuffer(path)
    bufferCache.set(path, buffer)
  }
  return buffer
}

// Fetches + decodes every sound file up front, so the very first real play
// (a hover, a flip, a win) just reads an already-decoded buffer instead of
// starting its own fetch from scratch — competing with everything else the
// page loads at once (~190 card images, fonts, etc.). Call once, e.g. on
// App mount.
export function preloadSounds(): void {
  for (const path of SOUND_PATHS) {
    getBuffer(path).catch(() => {
      // Best-effort — a failed fetch/decode here just means playSound()
      // fails the same way, later, when actually called.
    })
  }
}

// Plays a sound via a fresh AudioBufferSourceNode per call — cheap to
// create/destroy (unlike a whole new HTMLAudioElement per play) and lets
// overlapping triggers (e.g. several flip sounds a fraction of a second
// apart) play independently, all reading the one shared decoded buffer.
export function playSound(path: string): void {
  const ctx = getAudioContext()
  // Browsers keep AudioContext suspended until a real user gesture (a hover
  // doesn't count) — resume() is a cheap no-op once it's already running,
  // and does nothing if this call itself isn't gesture-driven either; the
  // context still starts working the moment a real interaction happens
  // elsewhere on the page.
  ctx.resume().catch(() => {})

  getBuffer(path)
    .then((buffer) => {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(getMasterGain())
      source.start()
    })
    .catch(() => {
      // Fetch/decode failure — nothing to surface here.
    })
}
