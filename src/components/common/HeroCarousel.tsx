import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, CheckCircle2, Star } from 'lucide-react';

interface SlideItem {
  id: number;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
  ctaText: string;
  highlight: string;
}

const HERO_SLIDES: SlideItem[] = [
  {
    id: 1,
    title: "Nuestra Gente & Excelencia Operativa",
    subtitle: "Formación integral para el desarrollo de competencias técnicas, liderazgo, cultura de calidad y servicio impecable en campo.",
    tag: "Cultura & Liderazgo Claro",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Explorar Capacitaciones",
    highlight: "100% Cobertura Nacional"
  },
  {
    id: 2,
    title: "Técnicos de Campo & Redes de Última Milla",
    subtitle: "Acompañamiento OJT continuo, instalación de soluciones Mesh, fibra óptica FTTH y protocolos First-Time Fix.",
    tag: "Operaciones & Tutoría OJT",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Ver Cursos de Redes",
    highlight: "Metodología 70-20-10"
  },
  {
    id: 3,
    title: "Prevención, Salud & Seguridad Ocupacional",
    subtitle: "Protocolos de tolerancia cero en EPP, mitigación de riesgos laborales y normativas corporativas vigentes.",
    tag: "Seguridad Industrial & Prevención",
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Cursos de Seguridad",
    highlight: "Cero Accidentes"
  },
  {
    id: 4,
    title: "Transformación Digital & Soluciones Avanzadas",
    subtitle: "Dominio de herramientas en la nube, sistemas de gestión inteligente y plataformas tecnológicas de última generación.",
    tag: "Innovación & Tecnología",
    imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Ver Novedades Digitales",
    highlight: "Certificaciones Ágiles"
  }
];

interface HeroCarouselProps {
  onExplore?: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onExplore }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused, currentSlide]);

  const handlePrev = () => {
    setCurrentSlide(prev => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 bg-slate-950 group select-none"
    >
      
      {/* Background Image with Cinematic Gradient Overlays */}
      <div className="relative h-[340px] sm:h-[400px] lg:h-[450px] w-full overflow-hidden">
        {HERO_SLIDES.map((s, idx) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105 pointer-events-none'
            }`}
          >
            <img
              src={s.imageUrl}
              alt={s.title}
              loading={idx === 0 ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-cover object-center transform transition-transform duration-10000 ease-out"
            />
          </div>
        ))}
        
        {/* Multi-layered Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent w-full md:w-3/4 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30 z-10" />
      </div>

      {/* Slide Content */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-3xl text-left">
        
        {/* Top Badges */}
        <div className="flex items-center gap-2 mb-3.5 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#DA291C] to-red-600 text-white text-xs font-black shadow-lg shadow-red-500/40 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{slide.tag}</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 border border-white/20 text-xs font-semibold backdrop-blur-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{slide.highlight}</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15] mb-3 drop-shadow-md">
          {slide.title}
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm lg:text-base text-slate-200/90 leading-relaxed mb-6 max-w-2xl line-clamp-2 sm:line-clamp-3 font-normal drop-shadow-sm">
          {slide.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <button
            onClick={onExplore}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#E02418] hover:from-red-600 hover:to-red-700 text-white text-xs sm:text-sm font-black shadow-xl shadow-red-600/35 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-red-400/30"
          >
            <span>{slide.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-xs text-slate-300 font-medium">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Plataforma Oficial de Capacitación</span>
          </div>
        </div>

      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-white/20 hover:bg-[#DA291C] text-white border border-white/20 hover:border-red-500 flex items-center justify-center backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl cursor-pointer active:scale-90"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-white/20 hover:bg-[#DA291C] text-white border border-white/20 hover:border-red-500 flex items-center justify-center backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl cursor-pointer active:scale-90"
        aria-label="Siguiente slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Modern Slide Progress Indicators */}
      <div className="absolute bottom-5 left-6 sm:left-12 lg:left-16 z-30 flex items-center gap-2.5">
        {HERO_SLIDES.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setCurrentSlide(idx)}
            className="group/btn relative py-2 cursor-pointer focus:outline-none"
            aria-label={`Ir a diapositiva ${idx + 1}`}
          >
            <div className={`h-1.5 rounded-full transition-all duration-500 overflow-hidden ${
              currentSlide === idx ? 'w-12 bg-white/30' : 'w-5 bg-white/20 group-hover/btn:bg-white/40'
            }`}>
              {currentSlide === idx && (
                <div 
                  className="h-full bg-gradient-to-r from-[#DA291C] to-red-400 rounded-full animate-progressPulse origin-left"
                  style={{ animationDuration: '6.5s' }}
                />
              )}
            </div>
          </button>
        ))}
      </div>

    </div>
  );
};
