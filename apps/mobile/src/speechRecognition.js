// لایه امن روی expo-speech-recognition.
// در Expo Go ماژول native وجود ندارد و import مستقیم آن در لحظه بارگذاری خطا می‌دهد
// (و چون expo-router همه صفحه‌ها را با هم بارگذاری می‌کند، کل اپ باز نمی‌شود).
// اینجا import داخل try/catch است؛ اگر ماژول نبود، یک نسخه خالی برمی‌گردد
// و فقط قابلیت تلفظ کار نمی‌کند.

let Native = null;
try {
    // eslint-disable-next-line global-require
    Native = require('expo-speech-recognition');
} catch {
    Native = null;
}

export const speechRecognitionSupported = !!Native?.ExpoSpeechRecognitionModule;

const noop = () => {};

// نسخه خالی با همان شکل API
const STUB = {
    start: noop,
    stop: noop,
    abort: noop,
    requestPermissionsAsync: async () => ({ granted: false }),
};

export const ExpoSpeechRecognitionModule = Native?.ExpoSpeechRecognitionModule ?? STUB;

// هوک خالی (ثابت بین رندرها، پس ترتیب هوک‌ها به‌هم نمی‌خورد)
export const useSpeechRecognitionEvent = Native?.useSpeechRecognitionEvent ?? noop;