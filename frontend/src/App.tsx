import React, { useState, useEffect } from "react";

/* ─── Premium landing components (VeriBid template) ─────────────── */
import { Navbar }               from "./components/Navbar";
import { Hero }                 from "./components/Hero";
import { TrustBand }            from "./components/TrustBand";
import { HowItWorks }           from "./components/HowItWorks";
import { UseCaseTabs }          from "./components/UseCaseTabs";
import { ProductStory }         from "./components/ProductStory";
import { FeaturesGrid }         from "./components/FeaturesGrid";
import { WorkflowComparison }   from "./components/WorkflowComparison";
import { ContradictionDetector } from "./components/ContradictionDetector";
import { BidDocumentAnimation } from "./components/BidDocumentAnimation";
import { FAQ }                  from "./components/FAQ";
import { Footer }               from "./components/Footer";
import { DocsPage }             from "./components/DocsPage";

/* ─── Dedicated Dedicated Demo / Audit Workspace Page ────────────── */
import { WorkspacePage }        from "./pages/WorkspacePage";

/* ─── Types ──────────────────────────────────────────────────────── */
type AppView = "landing" | "docs" | "workspace";
type Tab = "cases" | "citizen" | "auditor" | "verify";

/* ─── Main App ───────────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState<AppView>("landing");
  const [initialTab, setInitialTab] = useState<Tab>("cases");

  /* Deep-link support: ?view=workspace or ?tab=verify routes straight to WorkspacePage */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as Tab | null;
    const viewParam = params.get("view") as AppView | null;

    if (tabParam && ["cases", "citizen", "auditor", "verify"].includes(tabParam)) {
      setInitialTab(tabParam);
      setView("workspace");
    } else if (viewParam === "workspace") {
      setView("workspace");
    } else if (viewParam === "docs") {
      setView("docs");
    }
  }, []);

  const openWorkspace = (targetTab?: Tab) => {
    if (targetTab) setInitialTab(targetTab);
    setView("workspace");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Dedicated Workspace / Demo View ──────────────────────────── */
  if (view === "workspace") {
    return (
      <WorkspacePage
        onBack={() => {
          setView("landing");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDocsClick={() => setView("docs")}
        initialTab={initialTab}
      />
    );
  }

  /* ─── Full Interactive Docs View ──────────────────────────────── */
  if (view === "docs") {
    return <DocsPage onClose={() => setView("landing")} />;
  }

  /* ─── Landing Page View ────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] selection:bg-[#F59E0B] selection:text-[#0B1B3D]">

      {/* ── Fixed premium Navbar ──────────────────────────────── */}
      <Navbar
        onDocsClick={() => setView("docs")}
        onLaunchDemo={() => openWorkspace("cases")}
      />

      <main className="flex-1">
        {/* ── Hero + Enhanced Audit Matrix ──────────────────────── */}
        <Hero onLaunch={() => openWorkspace("cases")} />

        {/* ── Enhanced Technical Foundations & Field Context ───── */}
        <TrustBand />

        {/* ── Narrative & Verification Features ─────────────────── */}
        <HowItWorks />
        <UseCaseTabs />
        <ProductStory />
        <FeaturesGrid />
        <WorkflowComparison />
        <ContradictionDetector />
        <BidDocumentAnimation />
        <FAQ />
      </main>

      {/* ── Premium Footer ─────────────────────────────────────── */}
      <Footer onDocsClick={() => setView("docs")} />
    </div>
  );
}
