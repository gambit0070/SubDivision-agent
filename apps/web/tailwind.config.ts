import type { Config } from 'tailwindcss'
import preset from '@subdivision/config/tailwind.preset'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [preset as any],
  theme: { extend: {} },
  plugins: [],
}
export default config
