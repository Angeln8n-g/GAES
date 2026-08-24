import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, BookOpen, ShieldCheck, Award, ArrowRight } from 'lucide-react';

interface SlideItem {
  id: number;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
  ctaText: string;
  ctaAction?: () => void;
}

const HERO_SLIDES: SlideItem[] = [
  {
    id: 1,
    title: "Nuestra Gente & Excelencia Operativa",
    subtitle: "Formación integral para el desarrollo de competencias técnicas, liderazgo y calidad de servicio en campo.",
    tag: "Cultura & Valores Claro",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Explorar Capacitaciones"
  },
  {
    id: 2,
    title: "Técnicos de Campo & Redes de Última Milla",
    subtitle: "Acompañamiento OJT, instalación de soluciones Mesh, fibra óptica FTTH y protocolos de primera visita.",
    tag: "Operaciones & OJT",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Ver Cursos de Redes"
  },
  {
    id: 3,
    title: "Prevención & Seguridad en el Área de Trabajo",
    subtitle: "Protocolos de tolerancia cero en EPP, prevención de riesgos laborales y normativas vigentes.",
    tag: "Seguridad Industrial",
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Cursos de Seguridad"
  },
  {
    id: 4,
    title: "Transformación Digital & Soluciones Claro TV+",
    subtitle: "Dominio de herramientas en la nube, sistemas de gestión y plataformas avanzadas de entretenimiento.",
    tag: "Innovación Tecnológica",
    imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1600&q=80",
    ctaText: "Ver Novedades"
  }
];

interface HeroCarouselProps {
  onExplore?: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onExplore }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentSlide(prev => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 group">
      
      {/* Background Image with Gradient Overlay */}
      <div className="relative h-[300px] sm:h-[380px] lg:h-[420px] w-full overflow-hidden">
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className="w-full h-full object-cover object-center transform scale-105 transition-all duration-1000 ease-out"
        />
        
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent w-full md:w-3/4 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20 z-10" />
      </div>

      {/* Slide Content */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-2xl text-left">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#DA291C] text-white text-xs font-bold w-fit mb-3 shadow-lg shadow-red-500/30 backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-500">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{slide.tag}</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3 animate-in fade-in slide-in-from-left-6 duration-700">
          {slide.title}
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6 line-clamp-3 animate-in fade-in slide-in-from-left-8 duration-700">
          {slide.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <button
            onClick={onExplore}
            className="px-5 py-2.5 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-xl shadow-red-600/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <span>{slide.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/70 hover:bg-[#DA291C] text-slate-800 hover:text-white border border-slate-200 hover:border-red-500 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-lg"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/70 hover:bg-[#DA291C] text-slate-800 hover:text-white border border-slate-200 hover:border-red-500 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-lg"
        aria-label="Siguiente slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-6 sm:left-12 lg:left-16 z-30 flex items-center gap-2">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-2 rounded-full transition-all ${
              currentSlide === idx ? 'w-8 bg-[#DA291C]' : 'w-2 bg-white/50 hover:bg-white'
            }`}
            aria-label={`Ir al slide ${idx + 1}`}
          />
        ))}
      </div>

    </div>
  );
};
