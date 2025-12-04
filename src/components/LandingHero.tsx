import { Check, Target, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeatureCard } from '@/components/FeatureCard';

interface LandingHeroProps {
  onLoginClick: () => void;
}

export function LandingHero({ onLoginClick }: LandingHeroProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-12">
      <div className="flex flex-col items-center text-center">
        <div className="mb-8 flex h-24 w-24 animate-float items-center justify-center rounded-2xl bg-primary glow-red">
          <Check className="h-14 w-14 text-primary-foreground" />
        </div>

        <h1 className="mb-4 text-5xl font-extrabold italic tracking-tight text-gradient sm:text-6xl md:text-7xl">
          VERIZON
        </h1>

        <h2 className="mb-4 text-lg font-medium tracking-widest text-muted-foreground">
          Roblox Limited Sniper
        </h2>

        <p className="mb-8 max-w-md text-sm text-muted-foreground">
          Track your snipes, analyze profits, and dominate the limited market with precision analytics
        </p>

        <Button variant="hero" size="xl" onClick={onLoginClick}>
          <Check className="h-5 w-5" />
          Connect Your Account
        </Button>
      </div>

      <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={<Target className="h-6 w-6" />}
          title="Precision Sniping"
          description="Lightning-fast item detection"
        />
        <FeatureCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Profit Tracking"
          description="Real-time portfolio analytics"
        />
        <FeatureCard
          icon={<Shield className="h-6 w-6" />}
          title="Secure"
          description="Local encryption for your data"
        />
      </div>
    </main>
  );
}
