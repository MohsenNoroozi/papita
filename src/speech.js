import * as Speech from 'expo-speech';

const LANGUAGE = 'en-US'; // برای لهجه بریتانیایی: 'en-GB'
const DEFAULT_RATE = 0.9;

// پخش خودکار در هر بخش (هر کدام را false کنید تا خاموش شود)
export const AUTO_PLAY_ON_INTRO = true;
export const AUTO_PLAY_ON_QUIZ = true;
export const AUTO_PLAY_ON_REVIEW = false;
export const AUTO_PLAY_ON_LEARN = true;

export function speak(text, { rate = DEFAULT_RATE } = {}) {
    if (!text) return;
    Speech.stop(); // جلوگیری از هم‌پوشانی صداها
    Speech.speak(text, { language: LANGUAGE, rate });
}

export function stopSpeaking() {
    Speech.stop();
}