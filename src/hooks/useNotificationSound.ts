import { useCallback } from 'react';

type SoundType = 'success' | 'warning' | 'error' | 'info' | 'sale';

export const useNotificationSound = () => {
  const playSound = useCallback((type: SoundType = 'info') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const frequencies: Record<SoundType, number[]> = {
        success: [523, 659, 784],     // C5, E5, G5 - acorde maior ascendente
        warning: [440, 392],           // A4, G4 - descendente
        error: [294, 262],             // D4, C4 - tom grave
        info: [523, 659],              // C5, E5 - duas notas suaves
        sale: [659, 784, 880],         // E5, G5, A5 - celebração
      };

      const durations: Record<SoundType, number> = {
        success: 0.12,
        warning: 0.15,
        error: 0.2,
        info: 0.1,
        sale: 0.1,
      };

      const notes = frequencies[type];
      const duration = durations[type];

      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

        const startTime = audioContext.currentTime + index * duration;
        const endTime = startTime + duration;

        // Envelope suave
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

        oscillator.start(startTime);
        oscillator.stop(endTime + 0.1);
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  return { playSound };
};
