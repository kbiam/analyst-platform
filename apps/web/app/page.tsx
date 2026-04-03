import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-xl tracking-tight font-semibold text-white">
            analyst.
          </span>
          <div className="flex items-center gap-8">
            <Link
              href="/tools"
              className="text-sm tracking-wide uppercase text-stone-300 hover:text-white transition-colors"
            >
              Tools
            </Link>
            <Link
              href="/tools"
              className="px-5 py-2.5 bg-white text-stone-900 text-sm font-medium rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen pt-20 overflow-hidden bg-stone-900">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          {/* Heading */}
          <div className="pt-16 md:pt-28 pb-20 md:pb-32">
            <h1
              className="text-center animate-fade-up-delay-1"
              style={{ lineHeight: 0.9 }}
            >
              <span
                className="block text-[clamp(3rem,10vw,7rem)] font-light tracking-tighter text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Research & Intelligence
              </span>
              <span
                className="block text-[clamp(3rem,10vw,7rem)] font-light tracking-tighter italic text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Automated
              </span>
            </h1>

            <p className="text-center text-lg md:text-xl text-stone-400 font-light leading-relaxed max-w-2xl mx-auto mt-10 mb-12 animate-fade-up-delay-2">
              AI-powered tools that extract, enrich, and organize business
              intelligence — so your team can focus on closing deals, not
              building spreadsheets.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up-delay-3">
              <Link
                href="/tools"
                className="flex items-center gap-2 px-6 py-4 bg-white text-stone-900 font-medium rounded-lg hover:bg-stone-100 transition-colors group"
              >
                Explore Tools
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="#capabilities"
                className="px-6 py-4 text-stone-400 font-medium hover:text-white transition-colors"
              >
                See Capabilities
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden max-w-2xl mx-auto animate-fade-up-delay-4">
            {[
              { number: "10x", label: "Faster Research" },
              { number: "AI", label: "Powered Extraction" },
              { number: "1-Click", label: "Export to Excel" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 backdrop-blur-sm p-6 md:p-8 text-center"
              >
                <div className="text-3xl md:text-4xl font-light tracking-tight mb-1 text-white">
                  {stat.number}
                </div>
                <div className="text-xs md:text-sm text-stone-400 tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-32 bg-stone-50" id="capabilities">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-20">
            <p className="text-sm tracking-widest uppercase text-stone-400 mb-4">
              What It Does
            </p>
            <h2
              className="text-4xl md:text-5xl font-light tracking-tight text-stone-900 mb-6"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Intelligence workflows
              <br className="hidden md:block" /> you can run in minutes
            </h2>
            <p className="text-lg text-stone-500 font-light leading-relaxed max-w-xl">
              Point it at any public data source. Our agents scrape, parse,
              enrich, and deliver structured results — ready for your CRM,
              pitch deck, or outreach.
            </p>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "Point",
                desc: "Paste a URL, upload a file, or describe what you need. The agent figures out the rest.",
              },
              {
                num: "02",
                title: "Extract",
                desc: "AI navigates pages, parses content, and pulls structured data into a live spreadsheet.",
              },
              {
                num: "03",
                title: "Enrich",
                desc: "Automatically cross-references LinkedIn, company data, and public sources to fill gaps.",
              },
            ].map((step) => (
              <div key={step.num}>
                <div
                  className="text-[5rem] font-extralight text-stone-200 leading-none mb-4"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-medium mb-3">{step.title}</h3>
                <p className="text-stone-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 px-6 py-4 bg-stone-900 text-white font-medium rounded-lg hover:bg-stone-800 transition-colors group"
            >
              Try It Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-lg tracking-tight font-semibold text-stone-900">
            analyst.
          </span>
          <div className="text-xs text-stone-400">
            Built with Claude &middot; Exa &middot; AG Grid
          </div>
        </div>
      </footer>
    </div>
  );
}
