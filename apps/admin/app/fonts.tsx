import localFont from 'next/font/local'

export const iranyekan = localFont({
  src: [
    {
      path: '../fonts/IRANYekanBlack.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../fonts/IRANYekanBold.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/IRANYekanExtraBlack.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../fonts/IRANYekanExtraBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../fonts/IRANYekanLight.ttf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../fonts/IRANYekanMedium.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../fonts/IRANYekanRegular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/IRANYekanThin.ttf',
      weight: '100',
      style: 'normal',
    }
  ],
  display: 'swap',
})