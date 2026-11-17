import { createContext, useContext } from 'react';

// ارتفاعی که نوار پایین از صفحه می‌گیرد (۰ وقتی نوار پنهان است)
const Ctx = createContext(0);
export const BarInsetProvider = Ctx.Provider;
export const useBarInset = () => useContext(Ctx);