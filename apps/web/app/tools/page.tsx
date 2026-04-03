import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Building2,
  Mail,
  FileSearch,
} from "lucide-react";

const tools = [
  {
    id: "extract",
    icon: Users,
    title: "Event Intelligence",
    description:
      "Extract speakers from conference and event pages, enrich with LinkedIn profiles, and export to Excel.",
    features: [
      "AI-powered page scraping",
      "LinkedIn enrichment via Exa",
      "Real-time spreadsheet view",
    ],
    href: "/extract",
    available: true,
  },
  {
    id: "company",
    icon: Building2,
    title: "Company Research",
    description:
      "Build detailed company profiles from public sources — funding, team, tech stack, competitors, and more.",
    features: [
      "Multi-source aggregation",
      "Firmographic data",
      "Competitive landscape",
    ],
    href: "#",
    available: false,
  },
  {
    id: "outreach",
    icon: Mail,
    title: "Outreach Builder",
    description:
      "Generate personalized outreach sequences using enriched prospect data and AI-written copy.",
    features: [
      "Persona-based messaging",
      "Multi-channel sequences",
      "CRM integration",
    ],
    href: "#",
    available: false,
  },
  {
    id: "docs",
    icon: FileSearch,
    title: "Document Analyzer",
    description:
      "Upload contracts, reports, or filings and extract structured insights, key terms, and summaries.",
    features: [
      "PDF & document parsing",
      "Key clause extraction",
      "Summary generation",
    ],
    href: "#",
    available: false,
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-stone-400 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="text-xl tracking-tight font-semibold text-stone-900"
            >
              analyst.
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <p className="text-sm tracking-widest uppercase text-stone-400 mb-4">
          Tools
        </p>
        <h1
          className="text-4xl md:text-5xl font-light tracking-tight text-stone-900 mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Pick a workflow
        </h1>
        <p className="text-lg text-stone-500 font-light leading-relaxed max-w-xl">
          Each tool is a specialized AI agent designed for a specific research
          task. Select one to get started.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-2 gap-5">
          {tools.map((tool, i) => {
            const Card = tool.available ? Link : "div";
            return (
              <Card
                key={tool.id}
                href={tool.available ? tool.href : "#"}
                className={`group relative p-6 bg-white border border-stone-200 rounded-lg transition-all duration-300 overflow-hidden ${
                  tool.available
                    ? "hover:shadow-md hover:-translate-y-1 cursor-pointer"
                    : "opacity-60 cursor-default"
                }`}
              >
                {/* Accent line on hover */}
                {tool.available && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-stone-900 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                )}

                <div className="flex items-start justify-between mb-6">
                  <div
                    className={`w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                      tool.available
                        ? "group-hover:bg-stone-900 group-hover:text-white"
                        : ""
                    }`}
                  >
                    <tool.icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {!tool.available && (
                      <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-1 rounded">
                        Coming Soon
                      </span>
                    )}
                    <span className="text-[4rem] font-extralight leading-none text-stone-100 group-hover:text-stone-200 transition-colors">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-medium mb-3">{tool.title}</h3>
                <p className="text-stone-500 leading-relaxed mb-6 text-[15px]">
                  {tool.description}
                </p>
                <ul className="space-y-2">
                  {tool.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm text-stone-500"
                    >
                      <span className="w-1 h-1 bg-stone-900 rounded-full flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {tool.available && (
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-stone-900 group-hover:text-stone-600 transition-colors">
                    Open tool
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
