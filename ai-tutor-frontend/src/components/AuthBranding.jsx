import { AUTH_TEXTS } from '@/constants/texts';

// Design Laws applied:
// - Solid Inter 800 headline (no gradient text anti-pattern)
// - Aurora gradient bg (animated, brand palette)
// - Feature highlights as flat glass cards (floating context = allowed)
// - No eyebrow chip pill above headline

const features = [
  { icon: 'forum',         label: 'AI Chat thông minh',      desc: 'Trò chuyện với tài liệu của bạn' },
  { icon: 'quiz',          label: 'Tạo quiz tự động',        desc: 'Luyện tập hiệu quả hơn' },
  { icon: 'account_tree',  label: 'Mindmap trực quan',       desc: 'Nắm bắt kiến thức nhanh chóng' },
];

export default function AuthBranding() {
  return (
    <div className="hidden lg:flex lg:w-1/2 text-white flex-col justify-between p-16 relative overflow-hidden">
      {/* Aurora gradient background */}
      <div className="absolute inset-0 animate-aurora" />
      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")" }}
      />
      {/* Floating decorative blobs */}
      <div className="absolute top-[-8%] right-[-8%] w-72 h-72 rounded-full bg-white/8 blur-[60px] pointer-events-none animate-float" />
      <div className="absolute bottom-[15%] left-[-5%] w-56 h-56 rounded-full bg-white/6 blur-[50px] pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined icon-thin text-white text-[20px]">auto_awesome</span>
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">{AUTH_TEXTS.LOGIN.HERO_TITLE}</span>
        </div>

        {/* Main copy — solid white, no gradient text */}
        <div className="space-y-6">
          <h2 className="text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white max-w-md">
            {AUTH_TEXTS.LOGIN.HERO_QUOTE}
          </h2>

          {/* Feature highlights — flat glass cards, NOT nested cards */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined icon-thin text-white text-[16px]">{f.icon}</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white leading-none">{f.label}</p>
                  <p className="text-[11px] text-white/65 font-medium mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[12px] text-white/50 font-medium">
          Học tập thông minh cùng AI Tutor ✦
        </p>
      </div>
    </div>
  );
}