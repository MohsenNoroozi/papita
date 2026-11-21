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

// پخش پشت‌سرهم چند متن با مکث بین آن‌ها
// steps: [{ text, rate?, pause? }]  (pause = مکث قبل از همان مورد، به میلی‌ثانیه)
// خروجی: تابع لغو. اگر speak() یا stopSpeaking() وسط کار صدا زده شود، زنجیره خودبه‌خود قطع می‌شود.
export function speakSequence(steps) {
    let cancelled = false;
    let timer = null;

    const run = (i) => {
        if (cancelled || i >= steps.length) return;
        const { text, rate = DEFAULT_RATE, pause = 0 } = steps[i];
        if (!text) return run(i + 1);
        timer = setTimeout(() => {
            if (cancelled) return;
            Speech.speak(text, {
                language: LANGUAGE,
                rate,
                onDone: () => run(i + 1), // فقط با تمام‌شدن طبیعی صدا ادامه می‌دهد
            });
        }, pause);
    };

    Speech.stop();
    run(0);

    return () => {
        cancelled = true;
        clearTimeout(timer);
        Speech.stop();
    };
}