/* One music player shared by every run. No playback before a game gesture. */
window.createGameMusic = function (track, getContext, onChange) {
  function read(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch {} }
  let enabled = read('mp_music_enabled', 'true') !== 'false';
  const storedVolume = Number(read('mp_music_volume', '0.25'));
  let volume = Number.isFinite(storedVolume) ? Math.max(0, Math.min(1, storedVolume)) : 0.25;
  let wanted = false, blocked = false, unavailable = false, focus = false;
  let context = null, gain = null, source = null, attempt = 0, duckTimer = null, ducked = false;
  track.loop = true;

  function shouldPlay() { return wanted && enabled && !document.hidden; }
  function emit() { onChange({ enabled, volume, blocked, unavailable }); }
  function mix() {
    const level = volume * (focus ? 0.15 : ducked ? 0.25 : 1);
    if (gain && context) {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(level, context.currentTime, 0.08);
    } else track.volume = level;
  }
  function connect() {
    if (source) return;
    context = getContext();
    if (context && context.createMediaElementSource) {
      gain = context.createGain();
      gain.gain.value = 0;
      source = context.createMediaElementSource(track);
      source.connect(gain).connect(context.destination);
      track.volume = 1;
    }
    mix();
  }
  function play() {
    const current = ++attempt;
    if (!shouldPlay()) { track.pause(); emit(); return; }
    blocked = false;
    try {
      connect();
      if (unavailable) { unavailable = false; track.load(); }
      const resumed = context && context.state === 'suspended' ? context.resume() : Promise.resolve();
      const started = track.play();
      Promise.all([resumed, started]).then(() => {
        if (!shouldPlay()) track.pause();
        if (current === attempt) { blocked = false; emit(); }
      }).catch(error => {
        if (current !== attempt || !shouldPlay()) return;
        blocked = true;
        unavailable = error.name === 'NotSupportedError' || !!track.error;
        track.pause();
        emit();
      });
    } catch {
      blocked = true;
      track.pause();
    }
    emit();
  }
  track.addEventListener('error', () => { unavailable = true; track.pause(); emit(); });
  track.addEventListener('pause', () => {
    // Expose a retry if the browser interrupted playback while the run is active.
    if (track.paused && shouldPlay() && !unavailable) { blocked = true; emit(); }
  });
  emit();

  return {
    start() { wanted = true; play(); },
    pause() { wanted = false; ++attempt; track.pause(); },
    toggle() {
      if (enabled && (blocked || unavailable)) {
        ++attempt; blocked = false; unavailable = false; track.load(); play(); return;
      }
      enabled = !enabled;
      save('mp_music_enabled', String(enabled));
      if (enabled) play(); else { ++attempt; track.pause(); emit(); }
    },
    setVolume(value) {
      const next = Number(value);
      if (!Number.isFinite(next)) return;
      volume = Math.max(0, Math.min(1, next));
      save('mp_music_volume', String(volume));
      mix(); emit();
    },
    setFocus(value) { focus = !!value; mix(); },
    duck(milliseconds = 450) {
      clearTimeout(duckTimer);
      ducked = true; mix();
      duckTimer = setTimeout(() => { ducked = false; mix(); }, milliseconds);
    }
  };
};
