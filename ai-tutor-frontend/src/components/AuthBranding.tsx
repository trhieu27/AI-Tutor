import { APP_COLORS } from '@/constants/colors';
import { AUTH_TEXTS } from '@/constants/texts';

export default function AuthBranding() {
  return (
    <div className="hidden lg:flex lg:w-1/2 text-white flex-col justify-between p-16 relative overflow-hidden"
      style={{
        backgroundColor: APP_COLORS.bgBrand
      }}>
      {/* Abstract Background Vectors */}
      <div className="absolute top-[-10%] left-[-10%] w-125 h-125 rounded-full border border-white opacity-15" />
      <div className="absolute bottom-[20%] right-[-10%] w-150 h-150 rounded-full border border-white opacity-15" />
      <div className="absolute top-[40%] left-[20%] w-200 h-200 rounded-full border border-white opacity-15" />
      <div className="relative z-10">
        <h1 className="text-2xl font-bold tracking-tight mb-20 text-white">{AUTH_TEXTS.LOGIN.HERO_TITLE} </h1>

        <div className="mb-8">
          <span className="material-symbols-outlined text-white/50 text-5xl mb-4 rotate-180 inline-block">format_quote</span>
          <h2 className="text-[38px] font-bold leading-tight mb-8 max-w-lg text-white">
            {AUTH_TEXTS.LOGIN.HERO_QUOTE}
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-white/40"></div>
            <p className="text-white/80 text-lg">{AUTH_TEXTS.LOGIN.HERO_QUOTE_AUTHOR}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex gap-20">
        <div>
          <p className="text-2xl font-bold text-white mb-2">{AUTH_TEXTS.LOGIN.HERO_STAT_1_TITLE}</p>
          <p className="text-white/50 text-xs font-bold tracking-widest uppercase">{AUTH_TEXTS.LOGIN.HERO_STAT_1_SUBTITLE}</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white mb-2">{AUTH_TEXTS.LOGIN.HERO_STAT_2_TITLE}</p>
          <p className="text-white/50 text-xs font-bold tracking-widest uppercase">{AUTH_TEXTS.LOGIN.HERO_STAT_2_SUBTITLE}</p>
        </div>
      </div>
    </div>
  );
}
