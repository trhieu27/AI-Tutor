import { cx } from "@/shared/ui/Premium";

/**
 * AuroraBackground Component
 * Renders dynamic, slow-shifting glow orbs using theme primary/secondary colors.
 * Overlaid with a grain/noise texture to create a premium, tactile "paper" look.
 * 
 * @param {string} className - Optional tailwind classes
 * @param {React.ReactNode} children - Children content
 */
export default function AuroraBackground({
  className = "",
  children,
  ...props
}) {
  return (
    <div
      className={cx(
        "absolute inset-0 z-0 overflow-hidden bg-[hsl(222_26%_8%)] select-none pointer-events-none",
        className
      )}
      {...props}
    >
      {/* Aurora Glowing Orbs */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen filter blur-[80px]">
        {/* Orb 1: Learning Green */}
        <div className="absolute -left-20 -top-20 h-[380px] w-[380px] rounded-full bg-[var(--color-brand-400)] opacity-70 animate-float" />
        
        {/* Orb 2: Study Blue */}
        <div className="absolute -right-20 -bottom-20 h-[420px] w-[420px] rounded-full bg-[var(--color-accent-500)] opacity-60 animate-float" style={{ animationDuration: "6s", animationDelay: "1s" }} />

        {/* Orb 3: Warm Progress */}
        <div className="absolute left-[30%] top-[40%] h-[300px] w-[300px] rounded-full bg-[oklch(62%_0.105_175)] opacity-40 animate-float" style={{ animationDuration: "8s", animationDelay: "2s" }} />
      </div>

      {/* Noise Texture Overlaid */}
      <div className="absolute inset-0 noise opacity-20 pointer-events-none" />

      {/* Vignette shadow finish */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,hsl(222_26%_8%)/0.75)] pointer-events-none" />

      {children}
    </div>
  );
}
