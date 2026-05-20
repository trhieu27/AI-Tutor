import { AUTH_BRANDING_TEXTS, AUTH_TEXTS } from "@/shared/constants/texts";
import AuroraBackground from "@/shared/ui/AuroraBackground";

function DecorativeCircles() {
  return (
    <div className="absolute inset-0 z-[1] flex items-center justify-center overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Central glow */}
      <div className="absolute h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,hsl(166_61%_35%/0.12)_0%,transparent_70%)]" />

      {/* Orbit ring lines */}
      <div className="absolute h-[420px] w-[420px] rounded-full border border-white/[0.06]" />
      <div className="absolute h-[300px] w-[300px] rounded-full border border-white/[0.08]" />
      <div className="absolute h-[180px] w-[180px] rounded-full border border-white/[0.06]" />

      {/* Dots on rings */}
      <div className="absolute h-[420px] w-[420px]">
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <span className="block h-2.5 w-2.5 rounded-full bg-[hsl(166_61%_45%/0.6)] shadow-[0_0_12px_hsl(166_61%_45%/0.4)]" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <span className="block h-1.5 w-1.5 rounded-full bg-[hsl(218_82%_55%/0.5)] shadow-[0_0_8px_hsl(218_82%_55%/0.3)]" />
        </div>
      </div>

      <div className="absolute h-[300px] w-[300px]">
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <span className="block h-2 w-2 rounded-full bg-[hsl(166_61%_50%/0.5)] shadow-[0_0_10px_hsl(166_61%_50%/0.35)]" />
        </div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <span className="block h-1 w-1 rounded-full bg-white/30" />
        </div>
      </div>

      <div className="absolute h-[180px] w-[180px]">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <span className="block h-1.5 w-1.5 rounded-full bg-[hsl(218_82%_60%/0.55)] shadow-[0_0_8px_hsl(218_82%_60%/0.3)]" />
        </div>
      </div>
    </div>
  );
}

export default function AuthBranding() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col items-start justify-between overflow-hidden border-r border-white/10 p-12 text-white relative">
      {/* Dynamic Aurora Ambient Background */}
      <AuroraBackground />

      {/* Atmospheric Grid overlay */}
      <div
        className="absolute inset-0 z-[1] opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(0 0% 100% / 0.08) 1px, transparent 1px), linear-gradient(to bottom, hsl(0 0% 100% / 0.08) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />

      {/* Decorative interactive circles */}
      <DecorativeCircles />

      {/* Top — Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)] shadow-[0_10px_24px_hsl(222_29%_12%/0.16)]">
          <span className="material-symbols-outlined text-[18px]">school</span>
        </span>
        <span className="text-[14px] font-semibold">{AUTH_TEXTS.LOGIN.HERO_TITLE}</span>
      </div>

      {/* Center — Headline with premium shimmer text */}
      <div className="relative z-10 max-w-xl">
        <h2 className="text-balance text-[42px] font-bold leading-[1.02] text-white">
          {AUTH_BRANDING_TEXTS.headline}
        </h2>
        <p className="mt-5 max-w-md text-[15px] font-medium leading-7 text-white/68">
          {AUTH_TEXTS.LOGIN.HERO_QUOTE}
        </p>
      </div>

      {/* Bottom — Feature pills */}
      <div className="relative z-10 flex flex-wrap gap-2">
        {[
          { icon: "forum", label: "Hỏi AI" },
          { icon: "quiz", label: "Trắc nghiệm" },
          { icon: "account_tree", label: "Sơ đồ tư duy" },
          { icon: "library_books", label: "Thư viện tài liệu" },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/60 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined icon-thin text-[14px]">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

