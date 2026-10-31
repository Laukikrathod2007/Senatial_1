"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Pause, Volume2, VolumeX, Sparkles, ShieldCheck } from "lucide-react";

interface DemoVideoSectionProps {
  onLaunchDemo?: () => void;
}

export function DemoVideoSection({ onLaunchDemo }: DemoVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <section className="py-16 bg-[#FAF9F6] border-b border-[#0B1B3D]/8 relative overflow-hidden">
      {/* Background ambient radial highlight */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Main Card matching the Reducto-style announcement banner */}
        <div className="bg-white rounded-3xl border border-[#0B1B3D]/10 p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Editorial Announcement */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-[#EA580C] text-[11px] font-mono font-bold tracking-wider uppercase mb-5 w-fit border border-amber-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>What's new · System Walkthrough</span>
              </div>

              {/* Title */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#0B1B3D] tracking-tight leading-[1.12] mb-4">
                Introducing: <br />
                <span className="font-sans font-bold bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#D97706] bg-clip-text text-transparent">
                  SENTINEL Engine
                </span>
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base text-[#0B1B3D]/70 font-sans leading-relaxed mb-8">
                Watch a complete walkthrough of how SENTINEL probes automated scholarship decisions from the outside, uncovers algorithmic bias without internal access, and seals verifiable cryptographic proof packs.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  onClick={onLaunchDemo}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#EA580C] to-[#F59E0B] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-mono uppercase text-xs tracking-wider font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer group"
                >
                  <span>LAUNCH LIVE DEMO</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-5 py-3.5 border border-[#0B1B3D]/20 hover:border-[#0B1B3D] hover:bg-neutral-50 text-[#0B1B3D] font-mono uppercase text-xs tracking-wider font-semibold rounded-xl transition-all"
                >
                  EXPLORE WORKFLOW
                </a>
              </div>

              {/* Micro note below buttons */}
              <div className="mt-6 flex items-center gap-2 text-[11px] font-mono text-[#0B1B3D]/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero-knowledge black-box demonstration</span>
              </div>
            </div>

            {/* Right Column: HTML5 Video Player */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl overflow-hidden bg-[#0B1B3D] border border-[#0B1B3D]/15 shadow-xl aspect-video group">
                <video
                  ref={videoRef}
                  src="/Demo_sentinel.mp4"
                  controls
                  playsInline
                  preload="metadata"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-cover rounded-2xl"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Caption under video */}
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#0B1B3D]/50 px-1">
                <span>SENTINEL · End-to-End System Demonstration</span>
                <span className="text-[#EA580C] font-semibold">Demo_sentinel.mp4</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
