import { Porcupine, BuiltinKeyword } from '@picovoice/porcupine-node';
import { parentPort } from 'worker_threads';

const ACCESS_KEY = process.env.PICOVOICE_ACCESS_KEY || '';

(async () => {
  const keywords = [
    BuiltinKeyword.PORCUPINE,
    BuiltinKeyword.HEY_GOOGLE,
    BuiltinKeyword.TERMINATOR
  ];
  const sensitivities = [0.7, 0.7, 0.7];

  const porcupine = new Porcupine(ACCESS_KEY, keywords, sensitivities);

  let lastHey = 0;
  parentPort?.on('message', (pcmI16) => {
    try {
      const idx = porcupine.process(pcmI16);
      const now = Date.now();
      if (idx === 1) lastHey = now;
      if (idx === 2 && now - lastHey < 1100) {
        parentPort?.postMessage({ type: 'wake' });
        console.log('[WakeDetector] Wake word detected!');
      }
    } catch (err) {
      console.error('[WakeDetector] Error:', err);
    }
  });
})(); 