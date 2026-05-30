import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Image as ImageIcon, Video, AudioLines, Sparkles, BarChart3, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DeepGuard AI — Detect Deepfakes in Images, Video & Audio" },
      { name: "description", content: "Production-grade AI media verification. Upload an image, video or audio file and receive an authenticity score, risk level and downloadable forensic report in seconds." },
    ],
  }),
  component: Landing,
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-2xl p-6 text-center">
      <div className="text-3xl md:text-4xl font-bold gradient-text">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Shield; title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:glow">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">DeepGuard <span className="gradient-text">AI</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#stats" className="hover:text-foreground">Performance</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden hero-bg">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Powered by Lovable AI · Multimodal Forensics
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
              Protect digital trust with{" "}
              <span className="gradient-text">AI-powered</span> deepfake detection
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Upload images, video or audio. DeepGuard analyses authenticity, surfaces manipulation
              evidence and delivers a forensic report you can download and share.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground glow">
                  Start verification <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline">Watch the workflow</Button>
              </a>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Real AI inference</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Encrypted storage</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Downloadable reports</span>
            </div>
          </div>

          {/* Animated AI ring */}
          <div className="relative mx-auto mt-16 h-48 w-48 md:h-64 md:w-64">
            <div className="absolute inset-0 rounded-full border border-primary/30" />
            <div className="absolute inset-3 rounded-full border border-secondary/30 animate-spin [animation-duration:14s]" />
            <div className="absolute inset-8 rounded-full border border-primary/40 animate-spin [animation-duration:8s] [animation-direction:reverse]" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary glow">
                <Shield className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Verification across every medium</h2>
          <p className="mt-3 text-muted-foreground">One platform. Three modalities. Every result backed by real AI inference.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Feature icon={ImageIcon} title="Image verification" desc="Detect GAN faces, face swaps, morphs and AI-edited photos with multi-region analysis." />
          <Feature icon={Video} title="Video verification" desc="Frame sampling + temporal analysis to catch lip-sync drift and boundary artefacts." />
          <Feature icon={AudioLines} title="Audio verification" desc="Spot voice cloning, synthetic speech and frequency anomalies in clips up to 25 MB." />
          <Feature icon={Sparkles} title="AI explanation" desc="Each verdict ships with plain-English reasoning and ranked findings." />
          <Feature icon={BarChart3} title="Confidence scoring" desc="Authenticity, manipulation and confidence percentages plus low / medium / high risk." />
          <Feature icon={Lock} title="Secure by default" desc="Private storage, row-level security and signed report URLs — your data stays yours." />
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-4">
          <Stat value="3" label="Modalities supported" />
          <Stat value="<10s" label="Median image verdict" />
          <Stat value="100%" label="Real AI inference" />
          <Stat value="PDF·CSV·JSON" label="Report formats" />
        </div>
      </section>

      {/* Workflow */}
      <section id="how" className="border-t border-border/50 bg-card/30 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">How DeepGuard works</h2>
            <p className="mt-3 text-muted-foreground">Four steps from upload to forensic report.</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-4">
            {[
              ["Upload media", "Image, video or audio — drag, drop, done."],
              ["AI processing", "Faces extracted, frames sampled, spectra analysed."],
              ["Deepfake analysis", "Multimodal model scores authenticity & confidence."],
              ["Verification report", "Verdict, evidence, downloadable PDF / CSV / JSON."],
            ].map(([t, d], i) => (
              <li key={t} className="glass rounded-2xl p-5">
                <div className="text-xs font-mono text-primary">STEP {i + 1}</div>
                <div className="mt-2 font-semibold">{t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{d}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">Ready to verify your first file?</h2>
        <p className="mt-3 text-muted-foreground">Free to start. No card required.</p>
        <Link to="/signup">
          <Button size="lg" className="mt-7 bg-gradient-to-r from-primary to-secondary text-primary-foreground glow">
            Create your account <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DeepGuard AI · AI-assisted media verification
      </footer>
    </div>
  );
}
