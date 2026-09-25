/* English lyrics follow the actual audio clock, including seeks and loops. */
(() => {
  let enabled = true;
  try { enabled = localStorage.getItem('mp_captions_en') !== 'false'; } catch {}
  const players = [...document.querySelectorAll('audio[data-captions-target]')].map(audio => {
    const trackElement = audio.querySelector('track[srclang="en"]');
    const output = document.getElementById(audio.dataset.captionsTarget);
    if (!trackElement || !output) return null;
    const track = trackElement.track;
    function update() {
      const text = enabled && !audio.paused && !audio.ended
        ? [...(track.activeCues || [])].map(cue => cue.text).join('\n') : '';
      output.textContent = text;
      output.hidden = !text;
    }
    track.addEventListener('cuechange', update);
    trackElement.addEventListener('load', update);
    for (const event of ['play', 'pause', 'ended', 'seeked', 'timeupdate', 'emptied']) {
      audio.addEventListener(event, update);
    }
    return { track, update };
  }).filter(Boolean);
  function render() {
    for (const button of document.querySelectorAll('[data-caption-toggle]')) {
      button.setAttribute('aria-pressed', String(enabled));
      button.textContent = document.documentElement.lang === 'it'
        ? `CC English: ${enabled ? 'sì' : 'no'}` : `English subtitles: ${enabled ? 'on' : 'off'}`;
    }
    for (const player of players) {
      // Audio elements have no native subtitle viewport; render cues as text.
      player.track.mode = enabled ? 'hidden' : 'disabled';
      player.update();
    }
  }
  for (const button of document.querySelectorAll('[data-caption-toggle]')) {
    button.addEventListener('click', () => {
      enabled = !enabled;
      try { localStorage.setItem('mp_captions_en', String(enabled)); } catch {}
      render();
    });
  }
  render();
})();
