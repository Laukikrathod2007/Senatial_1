import { ArrowUpRight, ExternalLink } from "lucide-react";

interface FooterProps {
  onDocsClick?: () => void;
}

export function Footer({ onDocsClick }: FooterProps) {
  return (
    <footer className="relative bg-[#060F24] text-white pt-32 pb-48 overflow-hidden border-t border-neutral-900">
      
      {/* Subtle top border reflection */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#EA580C]/30 to-transparent" />

      {/* Subtle dark amber radial glow in the center of the footer */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#EA580C]/5 blur-[120px] pointer-events-none" />

      {/* Grid columns container - Spacious layout */}
      <div className="max-w-[1440px] mx-auto px-8 lg:px-16 grid grid-cols-2 md:grid-cols-5 gap-x-16 gap-y-12 relative z-10">
        
        {/* Left Column: Brand and Info */}
        <div className="col-span-2 md:col-span-1">
          <a href="#" className="flex items-center gap-3 mb-8 group">
            <img 
              src="/logo-icon.png" 
              alt="SENTINEL Icon" 
              className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
            <span className="font-bold text-lg font-sans tracking-tight text-white">SENTINEL</span>
          </a>
          <p className="text-neutral-400 text-xs leading-relaxed mb-6">
            A public-interest workspace for examining automated decisions and organizing human-reviewed next steps.
          </p>
          
          {/* Social Links */}
          <div className="flex items-center gap-4 text-neutral-500">
            <a 
              href="https://github.com/Laukikrathod2007" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[#F59E0B] transition-colors duration-200 flex items-center gap-1 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="font-mono">GitHub</span>
            </a>
            <a 
              href="https://www.linkedin.com/in/laukik-rathod-182337311/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[#F59E0B] transition-colors duration-200 flex items-center gap-1 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="font-mono">LinkedIn</span>
            </a>
          </div>
        </div>

        {/* Column 2: Product */}
        <div>
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider mb-8 text-neutral-300">Product</h4>
          <ul className="space-y-4 text-xs text-neutral-400 font-sans">
            <li>
              {onDocsClick ? (
                <button 
                  onClick={onDocsClick}
                  className="hover:text-white flex items-center gap-1 transition-colors duration-200 text-left w-full cursor-pointer"
                >
                  <span>Docs</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </button>
              ) : (
                <a href="#docs" className="hover:text-white flex items-center gap-1 transition-colors duration-200">
                  <span>Docs</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 hover:opacity-100 transition-opacity" />
                </a>
              )}
            </li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors duration-200">4-Stage Workflow</a></li>
            <li><a href="#decision-review" className="hover:text-white transition-colors duration-200">Cohort Review</a></li>
            <li><a href="#decision-scanner" className="hover:text-white transition-colors duration-200">Decision Scanner</a></li>
          </ul>
        </div>

        {/* Column 3: Audit Workflow */}
        <div>
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider mb-8 text-neutral-300">Workflow</h4>
          <ul className="space-y-4 text-xs text-neutral-400 font-sans">
            <li><a href="#how-it-works" className="hover:text-white transition-colors duration-200">1. Case Intake</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors duration-200">2. Provenance Notes</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors duration-200">3. Controlled Tests</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors duration-200">4. Human Follow-Up</a></li>
          </ul>
        </div>

        {/* Column 4: Foundations */}
        <div>
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider mb-8 text-neutral-300">Foundations</h4>
          <ul className="space-y-4 text-xs text-neutral-400 font-sans">
            <li><span className="hover:text-white transition-colors duration-200">FastAPI & Python</span></li>
            <li><span className="hover:text-white transition-colors duration-200">SQLite & SQLAlchemy</span></li>
            <li><span className="hover:text-white transition-colors duration-200">SHA-256 Merkle Roots</span></li>
            <li><span className="hover:text-white transition-colors duration-200">Ed25519 Signatures</span></li>
          </ul>
        </div>

        {/* Column 5: Ecosystem */}
        <div>
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider mb-8 text-neutral-300">Context</h4>
          <ul className="space-y-4 text-xs text-neutral-400 font-sans">
            <li><span className="hover:text-white transition-colors duration-200">Maharashtra Use Case</span></li>
            <li><span className="hover:text-white transition-colors duration-200">College Help Desks</span></li>
            <li><span className="hover:text-white transition-colors duration-200">NGO Caseworkers</span></li>
            <li><span className="hover:text-white transition-colors duration-200">e-Seva Access Points</span></li>
          </ul>
        </div>

      </div>

      {/* Copyright Bottom Row */}
      <div className="max-w-[1440px] mx-auto px-8 lg:px-16 mt-28 border-t border-neutral-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500 font-mono relative z-10">
        <span>© 2026 SENTINEL · Tech for Tomorrow 2026 (Pune, Maharashtra · IEEE Computer Society)</span>
        <div className="flex items-center gap-6">
          <a href="https://www.techfortomorrow.tech/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors duration-200">Event Info</a>
          <span className="text-neutral-600">Local Demonstration Scope</span>
        </div>
      </div>

      {/* Massive Halftone Dotted SENTINEL Wordmark at bottom */}
      <div className="absolute bottom-[-4.5vw] left-0 right-0 text-center select-none pointer-events-none z-0">
        <h1 
          className="font-sans font-black uppercase leading-none tracking-tighter"
          style={{ 
            fontSize: "18.5vw",
            backgroundImage: "linear-gradient(90deg, rgba(234, 88, 12, 0.35) 0%, rgba(245, 158, 11, 0.25) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            maskImage: "radial-gradient(circle, black 1.8px, transparent 1.8px)",
            WebkitMaskImage: "radial-gradient(circle, black 1.8px, transparent 1.8px)",
            maskSize: "8px 8px",
            WebkitMaskSize: "8px 8px",
          }}
        >
          sentinel
        </h1>
      </div>

    </footer>
  );
}
