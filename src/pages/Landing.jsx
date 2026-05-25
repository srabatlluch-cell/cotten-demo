import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
  MapPin, Phone, Clock, Shield, Award, Star,
  Zap, Activity, Smile, Sparkles, ChevronDown,
  CheckCircle, Globe, Menu, X, ArrowRight,
  Heart, Users, Target, Timer, Stethoscope,
  Microscope, Layers, CalendarCheck, ScanLine,
} from "lucide-react";

/* ── Images ───────────────────────────────────────────────── */
const UNSPLASH_HERO    = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80";
const UNSPLASH_TREATS  = "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80";
const UNSPLASH_DOCTOR  = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80";
const UNSPLASH_CONTACT = "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&auto=format&fit=crop&q=80";

/* ── Animation helpers ────────────────────────────────────── */
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const fadeUp = (vis, delay = 0, dur = 0.85) => ({
  opacity: vis ? 1 : 0,
  transform: vis ? "translateY(0)" : "translateY(28px)",
  transition: `opacity ${dur}s ${EASE} ${delay}s, transform ${dur}s ${EASE} ${delay}s`,
});

const slideFrom = (vis, dir = "left", delay = 0) => ({
  opacity: vis ? 1 : 0,
  transform: vis ? "translateX(0)" : `translateX(${dir === "left" ? "-46px" : "46px"})`,
  transition: `opacity 1s ${EASE} ${delay}s, transform 1s ${EASE} ${delay}s`,
});

/* ── Intersection Observer hook ───────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Static data ──────────────────────────────────────────── */
const treatments = [
  {
    icon: Zap,
    title: "Implantología Basal",
    tag: "Especialidad principal",
    desc: "Técnica avanzada con implantes de carga inmediata. Recupere su sonrisa en 72 horas con resultados permanentes y sin necesidad de injertos óseos.",
    featured: true,
    modal: {
      headline: "Recupere su sonrisa en 72 horas. Sin injertos. Sin esperas.",
      description: "La implantología basal es la técnica más avanzada para rehabilitar bocas con pérdida ósea severa. A diferencia de los implantes convencionales, los implantes basales se anclan en el hueso cortical, lo que elimina la necesidad de injertos y permite la carga inmediata. El Dr. Philippe Cotten introdujo esta técnica en España en 2004 y ha realizado más de 3.000 implantes con una tasa de éxito del 98%.",
      benefits: [
        { icon: Shield,       title: "Sin injerto óseo",          desc: "Válido para pacientes con hueso insuficiente donde los implantes convencionales fallan." },
        { icon: Zap,          title: "Carga inmediata",           desc: "Dientes provisionales fijos en 72 horas. No hay período sin dientes." },
        { icon: Award,        title: "Pioneros en España",        desc: "Dr. Cotten introdujo la técnica en 2004. Más experiencia que ningún otro centro en España." },
        { icon: CheckCircle,  title: "98% tasa de éxito",         desc: "Más de 3.000 implantes colocados con resultados documentados a largo plazo." },
      ],
      steps: [
        { title: "TAC 3D y diagnóstico",         desc: "Escáner de haz cónico para analizar el hueso disponible y planificar cada implante con precisión milimétrica." },
        { title: "Planificación digital",         desc: "Software 3D permite visualizar el resultado final antes de la cirugía y diseñar la prótesis con antelación." },
        { title: "Cirugía en una sola sesión",    desc: "Los implantes basales se colocan en una intervención ambulatoria bajo anestesia local o sedación consciente." },
        { title: "Dientes en 72 horas",           desc: "La prótesis provisional fija se instala en los días siguientes. Usted sale con dientes funcionales." },
      ],
      stats: [
        { value: "27+",   label: "años de experiencia" },
        { value: "3.000+",label: "implantes colocados"  },
        { value: "98%",   label: "tasa de éxito"        },
        { value: "72 h",  label: "hasta tener dientes"  },
      ],
    },
  },
  {
    icon: Activity,
    title: "Periodoncia",
    tag: "Salud gingival",
    desc: "Tratamiento integral de enfermedades periodontales para recuperar y mantener la salud de sus encías con las técnicas más actuales.",
    featured: false,
    modal: {
      headline: "Sus encías sanas son la base de una boca sana para siempre.",
      description: "La periodontitis afecta al 50% de los adultos y es la principal causa de pérdida dental. Nuestro servicio de periodoncia combina diagnóstico de precisión con tratamientos mínimamente invasivos para detener la enfermedad, eliminar la infección y devolver la salud a sus encías — preservando al máximo sus dientes naturales.",
      benefits: [
        { icon: Microscope,   title: "Diagnóstico de precisión",  desc: "Sondaje periodontal completo y radiografías periapicales para mapear el estado exacto de cada diente." },
        { icon: Heart,        title: "Preservamos sus dientes",   desc: "El objetivo siempre es conservar los dientes naturales. La extracción es el último recurso." },
        { icon: Shield,       title: "Tratamiento sin cirugía",   desc: "En fases iniciales y moderadas resolvemos el problema con raspado profesional sin necesidad de operar." },
        { icon: CalendarCheck,title: "Mantenimiento continuo",    desc: "Programa de revisiones periódicas para controlar la enfermedad y prevenir recaídas a largo plazo." },
      ],
      steps: [
        { title: "Exploración periodontal",        desc: "Medición de las bolsas periodontales, análisis radiológico y evaluación del nivel óseo en cada zona." },
        { title: "Plan personalizado",             desc: "Según la severidad establecemos si el tratamiento es conservador, quirúrgico o de mantenimiento." },
        { title: "Fase activa: raspado y curetaje",desc: "Eliminación del sarro subgingival y bacterias con ultrasonidos y curetas. Cómodo, efectivo y sin cirugía en la mayoría de casos." },
        { title: "Seguimiento y mantenimiento",    desc: "Revisiones cada 3-6 meses para mantener los resultados y detectar cualquier recidiva a tiempo." },
      ],
      stats: [
        { value: "50%",  label: "adultos afectados"       },
        { value: "1ª",   label: "causa de pérdida dental" },
        { value: "90%",  label: "casos sin cirugía"       },
        { value: "100%", label: "personalizado"           },
      ],
    },
  },
  {
    icon: Smile,
    title: "Ortodoncia",
    tag: "Alineación dental",
    desc: "Brackets estéticos y alineadores invisibles para corregir la posición de sus dientes con total comodidad y discreción.",
    featured: false,
    modal: {
      headline: "La sonrisa que siempre quisiste, a cualquier edad.",
      description: "La ortodoncia moderna va mucho más allá de la estética: una mordida correcta protege el esmalte, evita el desgaste y mejora la función masticatoria. En Clínica Cotten trabajamos con las técnicas más avanzadas — desde brackets de cerámica hasta alineadores Invisalign — adaptándonos a cada paciente, adulto o niño, para lograr resultados precisos y duraderos.",
      benefits: [
        { icon: ScanLine,     title: "Planificación 3D",          desc: "Escáner intraoral y software de simulación para ver el resultado final antes de empezar el tratamiento." },
        { icon: Layers,       title: "Todas las opciones",        desc: "Brackets metálicos, estéticos de cerámica, lingual y alineadores Invisalign. Elegimos juntos lo mejor para ti." },
        { icon: Users,        title: "Para todas las edades",     desc: "Tratamos niños desde los 7 años, adolescentes y adultos sin límite de edad con protocolos específicos." },
        { icon: Target,       title: "Resultados predecibles",    desc: "La planificación digital elimina sorpresas. Sabemos de antemano la posición final de cada diente." },
      ],
      steps: [
        { title: "Estudio ortodóncico",            desc: "Escáner 3D, fotografías y análisis cefalométrico para entender exactamente qué necesita tu mordida." },
        { title: "Simulación del resultado",       desc: "Visualizas en pantalla cómo quedará tu sonrisa antes de decidir. Sin compromiso hasta tu aprobación." },
        { title: "Inicio del tratamiento",         desc: "Colocación de brackets o entrega de alineadores. Primera semana de adaptación totalmente guiada." },
        { title: "Ajustes y retención",            desc: "Visitas periódicas cada 4-8 semanas. Finalizado el tratamiento, retenedores para mantener el resultado de por vida." },
      ],
      stats: [
        { value: "7+",    label: "años en adelante"     },
        { value: "18-24", label: "meses de media"       },
        { value: "3D",    label: "planificación digital" },
        { value: "∞",     label: "retención garantizada" },
      ],
    },
  },
  {
    icon: Sparkles,
    title: "Estética Dental",
    tag: "Sonrisa perfecta",
    desc: "Blanqueamiento profesional, carillas de porcelana y diseño de sonrisa para una apariencia natural y radiante.",
    featured: false,
    modal: {
      headline: "Una sonrisa diseñada para ti que dura toda la vida.",
      description: "La estética dental contemporánea no se trata de tener los dientes más blancos, sino de una sonrisa armoniosa que encaje con tus rasgos y te haga sentir seguro/a. En Clínica Cotten partimos de un análisis facial completo y diseño digital para definir con exactitud el resultado antes de tocar ningún diente. Cada tratamiento es único.",
      benefits: [
        { icon: Sparkles,     title: "Diseño de sonrisa digital",  desc: "Software de diseño facial nos permite previsualizar el resultado exacto adaptado a tu cara antes de cualquier intervención." },
        { icon: Star,         title: "Carillas de porcelana",      desc: "Láminas cerámicas ultrafinas (0,3 mm) que transforman color, forma y tamaño sin desgastar el diente natural." },
        { icon: Zap,          title: "Blanqueamiento profesional", desc: "Sistemas activados con luz LED de última generación. Hasta 8 tonos más en una sola sesión de 90 minutos." },
        { icon: Award,        title: "Resultado natural",          desc: "Materiales cerámicos de alta tecnología que imitan la translucidez del esmalte natural. Nadie sabrá que son carillas." },
      ],
      steps: [
        { title: "Análisis facial y fotográfico",  desc: "Fotografías clínicas de alta resolución y análisis de proporciones faciales para diseñar una sonrisa armoniosa." },
        { title: "Diseño digital de la sonrisa",   desc: "Simulación en pantalla del resultado final. Apruebas cada detalle — forma, color, tamaño — antes de empezar." },
        { title: "Mock-up en boca",                desc: "Prueba provisional en resina para que compruebes en el espejo el aspecto real antes de las carillas definitivas." },
        { title: "Transformación definitiva",      desc: "Colocación de las carillas o composite definitivo. Resultado inmediato, duradero y 100% natural." },
      ],
      stats: [
        { value: "1",     label: "sesión para blanquear" },
        { value: "15+",   label: "años duran las carillas"},
        { value: "0,3 mm",label: "grosor de la carilla"  },
        { value: "8",     label: "tonos más en una visita"},
      ],
    },
  },
];

/* ── Treatment modal (full-screen, two-column) ────────────── */
function TreatmentModal({ treatment, onClose, onContact }) {
  const { icon: Icon, title, tag, featured, modal } = treatment;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      style={{ background: "rgba(8,14,28,0.80)", backdropFilter: "blur(8px)", animation: "ccFadeIn 0.2s ease" }}
      onClick={onClose}
    >
      {/* Modal shell — full height, max 1100 px wide, centered */}
      <div
        className="relative m-auto w-full flex flex-col lg:flex-row overflow-hidden"
        style={{
          maxWidth: 1060,
          maxHeight: "92vh",
          borderRadius: 24,
          boxShadow: "0 40px 100px rgba(0,0,0,0.55)",
          animation: "ccSlideUp 0.30s cubic-bezier(0.22,0.8,0.35,1)",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── LEFT PANEL — navy, fixed visual ─────────────────── */}
        <div
          className="relative flex flex-col justify-between overflow-hidden flex-shrink-0"
          style={{
            width: "100%",
            background: "linear-gradient(155deg, #0d1526 0%, #1a2744 55%, #1e2f50 100%)",
            padding: "40px 36px",
            minHeight: 220,
          }}
        >
          {/* Large decorative icon behind content */}
          <div
            className="absolute"
            style={{ bottom: -20, right: -20, opacity: 0.06, pointerEvents: "none" }}
          >
            <Icon size={220} style={{ color: "#c9a96e" }} />
          </div>
          {/* Gold diagonal stripe */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, transparent 60%, rgba(201,169,110,0.07) 100%)", pointerEvents: "none" }}
          />

          {/* Top: tag + title */}
          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-5"
              style={{ background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.30)", color: "#c9a96e" }}
            >
              <Icon size={11} />
              {tag}
            </div>

            <h2
              className="font-light text-white mb-3 leading-tight"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}
            >
              {title}
            </h2>
            {/* Gold divider line */}
            <div style={{ width: 48, height: 3, background: "linear-gradient(90deg,#c9a96e,rgba(201,169,110,0.3))", borderRadius: 2, marginBottom: 20 }} />

            <p
              className="font-medium leading-snug"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem", maxWidth: 320 }}
            >
              {modal.headline}
            </p>
          </div>

          {/* Bottom: stats bar */}
          <div
            className="relative z-10 grid grid-cols-2 gap-3 mt-8 lg:mt-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 24 }}
          >
            {modal.stats.map(({ value, label }) => (
              <div key={label}>
                <p className="font-bold leading-none mb-1" style={{ color: "#c9a96e", fontSize: "1.45rem" }}>{value}</p>
                <p style={{ color: "rgba(255,255,255,0.40)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL — white, scrollable content ─────────── */}
        <div
          className="relative flex flex-col overflow-y-auto flex-1 bg-white"
          style={{ minWidth: 0 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 flex items-center justify-center rounded-xl transition-colors"
            style={{ width: 36, height: 36, background: "#f5f3f0", color: "#6b7280" }}
            onMouseEnter={e => e.currentTarget.style.background = "#e8e2d9"}
            onMouseLeave={e => e.currentTarget.style.background = "#f5f3f0"}
          >
            <X size={16} />
          </button>

          <div style={{ padding: "36px 36px 0" }}>
            {/* Description */}
            <p style={{ color: "#374151", fontSize: "0.875rem", lineHeight: 1.75, marginBottom: 32 }}>
              {modal.description}
            </p>

            {/* Por qué elegirnos */}
            <div style={{ marginBottom: 32 }}>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 3, height: 18, background: "linear-gradient(180deg,#c9a96e,rgba(201,169,110,0.3))", borderRadius: 2, flexShrink: 0 }} />
                <p style={{ color: "#1a2744", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em" }}>
                  Por qué elegirnos
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modal.benefits.map(({ icon: BIcon, title: btitle, desc }) => (
                  <div
                    key={btitle}
                    className="flex gap-3 rounded-2xl p-4"
                    style={{ background: "#faf9f7", border: "1px solid #f0ece6" }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{ width: 38, height: 38, background: "linear-gradient(135deg,#1a2744,#243256)" }}
                    >
                      <BIcon size={16} style={{ color: "#c9a96e" }} />
                    </div>
                    <div>
                      <p style={{ color: "#1a2744", fontSize: "0.8rem", fontWeight: 700, marginBottom: 3 }}>{btitle}</p>
                      <p style={{ color: "#6b7280", fontSize: "0.75rem", lineHeight: 1.6 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* El proceso */}
            <div style={{ marginBottom: 32 }}>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 3, height: 18, background: "linear-gradient(180deg,#c9a96e,rgba(201,169,110,0.3))", borderRadius: 2, flexShrink: 0 }} />
                <p style={{ color: "#1a2744", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em" }}>
                  El proceso
                </p>
              </div>
              <div className="space-y-3">
                {modal.steps.map(({ title: stitle, desc }, idx) => (
                  <div key={stitle} className="flex gap-4">
                    {/* Step number column */}
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                      <div
                        className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                        style={{ width: 32, height: 32, background: "linear-gradient(135deg,#c9a96e,#d9bc8a)", color: "#1a2744", fontSize: "0.8rem" }}
                      >
                        {idx + 1}
                      </div>
                      {idx < modal.steps.length - 1 && (
                        <div style={{ width: 1, flex: 1, minHeight: 16, background: "linear-gradient(180deg,rgba(201,169,110,0.4),transparent)", marginTop: 4 }} />
                      )}
                    </div>
                    {/* Step content */}
                    <div style={{ paddingBottom: idx < modal.steps.length - 1 ? 12 : 0 }}>
                      <p style={{ color: "#1a2744", fontSize: "0.82rem", fontWeight: 700, marginBottom: 3 }}>{stitle}</p>
                      <p style={{ color: "#6b7280", fontSize: "0.78rem", lineHeight: 1.65 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky CTA footer */}
          <div
            className="sticky bottom-0"
            style={{ background: "white", padding: "20px 36px 28px", borderTop: "1px solid #f0ece6" }}
          >
            <button
              onClick={onContact}
              className="w-full flex items-center justify-center gap-3 rounded-2xl font-semibold tracking-wide transition-all"
              style={{
                padding: "15px 24px",
                background: "linear-gradient(135deg,#c9a96e,#d9bc8a)",
                color: "#1a2744",
                fontSize: "0.9rem",
                boxShadow: "0 8px 28px rgba(201,169,110,0.40)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(201,169,110,0.56)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 8px 28px rgba(201,169,110,0.40)"; }}
            >
              Solicitar consulta gratuita
              <ArrowRight size={16} />
            </button>
            <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#9ca3af", marginTop: 10 }}>
              Sin compromiso · Respuesta en menos de 24 h · +34 932 041 069
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ccFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes ccSlideUp { from { opacity:0; transform:translateY(32px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }

        /* Left panel: full-width on mobile, fixed sidebar on desktop */
        @media (min-width: 1024px) {
          .cc-modal-left { width: 340px !important; }
        }
      `}</style>
    </div>
  );
}

const testimonials = [
  {
    name: "Carmen R.",
    treatment: "Implantes Basales",
    stars: 5,
    quote: "En menos de una semana tenía una sonrisa completamente nueva. El Dr. Cotten es un profesional extraordinario, con una paciencia y dedicación que no había encontrado en ningún otro especialista. Totalmente recomendable.",
  },
  {
    name: "Jordi M.",
    treatment: "Full Arch Completo",
    stars: 5,
    quote: "Llevaba años sin poder comer con normalidad. Gracias al tratamiento de carga inmediata del Dr. Cotten, ahora disfruto de cada comida. El equipo de la clínica es excepcional en todos los aspectos.",
  },
  {
    name: "Montserrat V.",
    treatment: "Implante Basal + Periodoncia",
    stars: 5,
    quote: "Me daba mucho miedo la cirugía, pero el Dr. Cotten y su equipo me explicaron todo con detalle y se aseguraron de que estuviera completamente cómoda. El resultado ha superado todas mis expectativas.",
  },
];

const credentials = [
  { value: "27+",    label: "Años de experiencia" },
  { value: "3.000+", label: "Implantes colocados"  },
  { value: "98%",    label: "Tasa de éxito"         },
];

/* ── Component ────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();

  /* scroll-to refs */
  const heroRef    = useRef(null);
  const treatRef   = useRef(null);
  const doctorRef  = useRef(null);
  const contactRef = useRef(null);

  /* ui state */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSolid,       setNavSolid]       = useState(false);
  const [heroImgY,       setHeroImgY]       = useState(0);
  const [hoveredCard,    setHoveredCard]    = useState(null);
  const [activeModal,    setActiveModal]    = useState(null);

  /* combined scroll handler */
  const lastScrollY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y          = window.scrollY;
      const goingDown  = y > lastScrollY.current;
      lastScrollY.current = y;

      /* navbar solid/transparent */
      if (y < 80) {
        setNavSolid(false);
      } else if (goingDown) {
        setNavSolid(true);
      } else {
        /* scrolling up — transparent once back inside hero area */
        const heroH = heroRef.current?.offsetHeight ?? 800;
        setNavSolid(y > heroH * 0.45);
      }

      /* hero parallax — image moves up slower than page */
      setHeroImgY(y * 0.26);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Intersection observer reveal hooks (must be top-level) */
  const [treatHeadRef,  treatHeadVis]  = useReveal(0.15);
  const [treatGridRef,  treatGridVis]  = useReveal(0.05);
  const [drLeftRef,     drLeftVis]     = useReveal(0.12);
  const [drRightRef,    drRightVis]    = useReveal(0.12);
  const [testHeadRef,   testHeadVis]   = useReveal(0.15);
  const [testGridRef,   testGridVis]   = useReveal(0.05);
  const [ctaHeadRef,    ctaHeadVis]    = useReveal(0.15);
  const [ctaCardsRef,   ctaCardsVis]   = useReveal(0.05);

  /* helpers */
  const scrollTo = (ref) => {
    setMobileMenuOpen(false);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navLinks = [
    { label: "Inicio",       ref: heroRef    },
    { label: "Tratamientos", ref: treatRef   },
    { label: "Dr. Cotten",   ref: doctorRef  },
    { label: "Contacto",     ref: contactRef },
  ];

  /* treatment card hover style */
  const cardHoverStyle = (title, featured) => ({
    transform:  hoveredCard === title ? "translateY(-4px)" : "translateY(0)",
    transition: "transform 0.32s ease, box-shadow 0.32s ease",
    boxShadow:  hoveredCard === title
      ? featured
        ? "0 20px 55px rgba(26,39,68,0.45)"
        : "inset 3px 0 0 #c9a96e, 0 14px 44px rgba(0,0,0,0.10)"
      : "none",
  });

  /* ── JSX ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background:    navSolid ? "rgba(26,39,68,0.97)"  : "transparent",
          backdropFilter:navSolid ? "blur(14px)"            : "none",
          borderBottom:  navSolid ? "1px solid rgba(201,169,110,0.15)" : "1px solid transparent",
          boxShadow:     navSolid ? "0 4px 28px rgba(0,0,0,0.28)"     : "none",
          transition:    "background 0.45s ease, backdrop-filter 0.45s ease, box-shadow 0.45s ease, border-color 0.45s ease",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo(heroRef)} className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                transition: "transform 0.25s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-base leading-tight">Clínica Cotten</p>
              <p className="text-xs tracking-widest uppercase" style={{ color: "#c9a96e" }}>Implantología Basal</p>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, ref }) => (
              <button
                key={label}
                onClick={() => scrollTo(ref)}
                className="text-sm tracking-wide"
                style={{
                  color: "rgba(255,255,255,0.70)",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "white"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.70)"}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <a
              href="tel:+34932041069"
              className="hidden md:flex items-center gap-2 text-sm py-2 px-4 rounded-full"
              style={{
                border: "1px solid rgba(255,255,255,0.22)",
                color: "rgba(255,255,255,0.80)",
                transition: "border-color 0.25s ease, color 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.5)"; e.currentTarget.style.color="white"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.22)"; e.currentTarget.style.color="rgba(255,255,255,0.80)"; }}
            >
              <Phone size={13} />
              +34 932 041 069
            </a>
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="hidden md:flex text-sm px-5 py-2 rounded-full font-medium"
              style={{
                background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                color: "#1a2744",
                transition: "opacity 0.25s ease, transform 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity="0.88"; e.currentTarget.style.transform="scale(1.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity="1";    e.currentTarget.style.transform="scale(1)";    }}
            >
              Portal Paciente
            </button>
            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: "rgba(255,255,255,0.85)", transition: "color 0.2s ease" }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          className="md:hidden overflow-hidden"
          style={{
            maxHeight: mobileMenuOpen ? "400px" : "0",
            transition: "max-height 0.4s ease",
            background: "rgba(26,39,68,0.98)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="px-6 pb-6 pt-3 flex flex-col gap-2">
            {navLinks.map(({ label, ref }) => (
              <button
                key={label}
                onClick={() => scrollTo(ref)}
                className="text-left text-sm py-2.5"
                style={{ color: "rgba(255,255,255,0.70)" }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="mt-2 text-sm px-5 py-3 rounded-xl font-medium text-center"
              style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
            >
              Portal Paciente
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col lg:flex-row"
        style={{ background: "linear-gradient(135deg, #111b33 0%, #1a2744 100%)" }}
      >
        {/* Left — text (load animations) */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 pt-32 pb-16 lg:py-0 z-10">
          <div className="max-w-xl">
            {/* Badge pill */}
            <div
              className="cc-hero-el cc-d1 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-widest mb-8 border"
              style={{ borderColor: "rgba(201,169,110,0.4)", color: "#c9a96e", background: "rgba(201,169,110,0.08)" }}
            >
              <Award size={12} />
              27 años · Especialistas en Implantología Basal
            </div>

            {/* H1 — three lines, last in gold */}
            <h1 className="cc-hero-el cc-d2 text-4xl md:text-5xl xl:text-6xl font-light text-white leading-tight mb-6">
              Especialistas en<br />
              Implantología Basal<br />
              <span className="font-semibold" style={{ color: "#c9a96e" }}>en Barcelona</span>
            </h1>

            {/* Subtitle */}
            <p className="cc-hero-el cc-d3 text-lg leading-relaxed mb-7 max-w-md" style={{ color: "rgba(255,255,255,0.60)" }}>
              Más de 27 años devolviendo la funcionalidad y la confianza a nuestros pacientes. Pioneros en implantología basal en España desde 2004.
            </p>

            {/* Credential chips */}
            <div className="cc-hero-el cc-d4 flex flex-wrap gap-2 mb-10">
              {[
                { icon: Award,        text: "Pioneros en España · 2004"     },
                { icon: CheckCircle,  text: "Técnica sin injerto óseo"       },
                { icon: Zap,          text: "Carga inmediata disponible"     },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: "rgba(201,169,110,0.10)", border: "1px solid rgba(201,169,110,0.25)", color: "#c9a96e" }}
                >
                  <Icon size={11} />
                  {text}
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="cc-hero-el cc-d5 flex flex-wrap gap-4 mb-10">
              <button
                onClick={() => navigate("/acceso-paciente")}
                className="cc-btn-pulse px-8 py-4 rounded-xl text-sm font-semibold tracking-wide"
                style={{
                  background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                  color: "#1a2744",
                  boxShadow: "0 8px 30px rgba(201,169,110,0.38)",
                  transition: "transform 0.3s ease, opacity 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px) scale(1.03)"; e.currentTarget.style.boxShadow="0 14px 40px rgba(201,169,110,0.60)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0) scale(1)";       e.currentTarget.style.boxShadow="0 8px 30px rgba(201,169,110,0.38)"; }}
              >
                Acceso Paciente
              </button>
              <button
                onClick={() => navigate("/acceso-personal")}
                className="px-8 py-4 rounded-xl text-sm font-medium tracking-wide"
                style={{
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "white",
                  transition: "background 0.3s ease, transform 0.3s ease, border-color 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.10)"; e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.50)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="transparent";            e.currentTarget.style.transform="translateY(0)";   e.currentTarget.style.borderColor="rgba(255,255,255,0.28)"; }}
              >
                Acceso Personal
              </button>
            </div>

            {/* Trust bar */}
            <div className="cc-hero-el cc-d6 flex items-center gap-0 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              {[
                { stat: "+27 años",   label: "de experiencia"    },
                { stat: "+1.000",     label: "pacientes tratados" },
                { stat: "0 injertos", label: "técnica basal"      },
              ].map(({ stat, label }, i) => (
                <div key={stat} className="flex items-center">
                  <div className="px-5 first:pl-0 text-center">
                    <p className="text-xl font-bold leading-tight" style={{ color: "#c9a96e" }}>{stat}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</p>
                  </div>
                  {i < 2 && (
                    <div className="w-px h-8 flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — photo with parallax */}
        <div className="relative lg:w-[52%] min-h-64 lg:min-h-0 overflow-hidden">
          <img
            src={UNSPLASH_HERO}
            alt="Clínica dental moderna"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "130%",
              objectFit: "cover",
              objectPosition: "center center",
              transform: `translateY(-${heroImgY}px)`,
              willChange: "transform",
            }}
          />
          {/* Navy fade from left */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(105deg, #1a2744 0%, rgba(26,39,68,0.42) 44%, rgba(26,39,68,0.12) 100%)" }}
          />
          {/* Floating badge (slides in from right on load) */}
          <div
            className="cc-badge-in absolute bottom-10 right-8 px-5 py-4 rounded-2xl hidden lg:block"
            style={{ background: "rgba(26,39,68,0.85)", border: "1px solid rgba(201,169,110,0.30)", backdropFilter: "blur(14px)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(201,169,110,0.18)" }}>
                <Shield size={18} style={{ color: "#c9a96e" }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Carga Inmediata</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Implantes en 72 horas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue — gentle float, no bounce */}
        <button
          onClick={() => scrollTo(treatRef)}
          className="cc-float absolute bottom-8 left-1/2 hidden lg:flex flex-col items-center gap-2"
          style={{ color: "rgba(255,255,255,0.32)", transition: "color 0.25s ease" }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.32)"}
        >
          <span className="text-xs uppercase tracking-widest">Descubra más</span>
          <ChevronDown size={17} />
        </button>
      </section>

      {/* ════════════════════════════════════════════════════════
          TRATAMIENTOS
      ════════════════════════════════════════════════════════ */}
      <section ref={treatRef} className="relative py-24 overflow-hidden" style={{ background: "#faf9f7" }}>
        {/* Subtle background texture */}
        <div className="absolute inset-0" style={{ opacity: 0.04 }}>
          <img src={UNSPLASH_TREATS} alt="" className="w-full h-full object-cover" />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #faf9f7 0%, rgba(250,249,247,0.93) 50%, #faf9f7 100%)" }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Section header — fade up on reveal */}
          <div ref={treatHeadRef} className="text-center mb-16" style={fadeUp(treatHeadVis)}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#c9a96e" }}>
              Nuestros tratamientos
            </p>
            <h2 className="text-4xl md:text-5xl font-light mb-5" style={{ color: "#1a2744" }}>
              Soluciones para cada<br />
              <span className="font-semibold">necesidad dental</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              Combinamos tecnología de vanguardia con más de 27 años de experiencia clínica para ofrecerle los mejores resultados.
            </p>
          </div>

          {/* Cards — staggered fade up */}
          <div ref={treatGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {treatments.map(({ icon: Icon, title, tag, desc, featured, modal }, i) => (
              <div
                key={title}
                className={featured ? "md:col-span-2 lg:col-span-2" : ""}
                style={fadeUp(treatGridVis, i * 0.12)}
              >
                <div
                  className="relative rounded-3xl p-7 flex flex-col h-full"
                  style={{
                    ...(featured
                      ? { background: "linear-gradient(135deg, #1a2744 0%, #243256 100%)" }
                      : { background: "white", border: "1px solid #e8e2d9" }
                    ),
                    ...cardHoverStyle(title, featured),
                  }}
                  onMouseEnter={() => setHoveredCard(title)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {featured && (
                    <span
                      className="absolute top-5 right-5 text-xs px-3 py-1 rounded-full font-medium"
                      style={{ background: "rgba(201,169,110,0.20)", color: "#c9a96e" }}
                    >
                      Especialidad
                    </span>
                  )}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={featured
                      ? { background: "rgba(201,169,110,0.15)" }
                      : { background: "linear-gradient(135deg, rgba(26,39,68,0.06), rgba(26,39,68,0.12))" }
                    }
                  >
                    <Icon size={22} style={{ color: featured ? "#c9a96e" : "#1a2744" }} />
                  </div>
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: featured ? "#c9a96e" : "#9ca3af" }}>
                    {tag}
                  </p>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: featured ? "white" : "#1a2744" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: featured ? "rgba(255,255,255,0.65)" : "#6b7280" }}>
                    {desc}
                  </p>
                  <button
                    onClick={() => setActiveModal({ icon: Icon, title, featured, modal })}
                    className="mt-6 text-xs font-semibold uppercase tracking-wider self-start"
                    style={{
                      color: featured ? "#c9a96e" : "#1a2744",
                      transition: "opacity 0.2s ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.60"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    Saber más →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          DR. COTTEN
      ════════════════════════════════════════════════════════ */}
      <section ref={doctorRef} className="py-24" style={{ background: "linear-gradient(135deg, #111b33 0%, #1a2744 100%)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Photo — slides in from left */}
            <div ref={drLeftRef} className="flex flex-col items-center lg:items-start gap-6" style={slideFrom(drLeftVis, "left")}>
              <div className="relative">
                <div
                  className="w-64 h-64 md:w-72 md:h-72 rounded-full overflow-hidden"
                  style={{
                    border: "4px solid rgba(201,169,110,0.50)",
                    boxShadow: "0 0 0 12px rgba(201,169,110,0.07), 0 24px 60px rgba(0,0,0,0.40)",
                  }}
                >
                  <img
                    src={UNSPLASH_DOCTOR}
                    alt="Dr. Philippe Cotten"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "top center" }}
                  />
                  <div className="absolute inset-0 rounded-full" style={{ background: "rgba(26,39,68,0.07)" }} />
                </div>
                <div
                  className="absolute -bottom-3 -right-3 w-20 h-20 rounded-full"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", opacity: 0.17 }}
                />
              </div>

              {/* Achievement badges */}
              <div className="flex gap-4 flex-wrap justify-center lg:justify-start">
                {credentials.map(({ value, label }, i) => (
                  <div
                    key={label}
                    className="px-5 py-3 rounded-2xl text-center"
                    style={{
                      background: "rgba(201,169,110,0.10)",
                      border: "1px solid rgba(201,169,110,0.22)",
                      ...fadeUp(drLeftVis, 0.2 + i * 0.12),
                    }}
                  >
                    <p className="text-2xl font-bold" style={{ color: "#c9a96e" }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio — slides in from right */}
            <div ref={drRightRef} style={slideFrom(drRightVis, "right", 0.1)}>
              <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "#c9a96e" }}>
                Conozca a su especialista
              </p>
              <h2 className="text-4xl md:text-5xl font-light text-white mb-1">Dr. Philippe</h2>
              <h2 className="text-4xl md:text-5xl font-semibold text-white mb-8">Cotten</h2>

              <div className="space-y-5 mb-8" style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", lineHeight: "1.75" }}>
                <p>
                  Con más de 27 años dedicados exclusivamente a la implantología basal, el Dr. Philippe Cotten es uno de los referentes internacionales en esta técnica revolucionaria que permite rehabilitar bocas completas en apenas 72 horas.
                </p>
                <p>
                  Formado en las mejores instituciones europeas y con experiencia en más de 3.000 implantes colocados, el Dr. Cotten ha ayudado a miles de pacientes a recuperar su sonrisa, su capacidad masticatoria y, sobre todo, su calidad de vida.
                </p>
                <p>
                  Su clínica en el corazón de Barcelona combina tecnología diagnóstica de última generación —TAC de haz cónico, planificación 3D— con un trato cercano y personalizado que caracteriza a Clínica Cotten.
                </p>
              </div>

              <div className="space-y-3 mb-10">
                {[
                  "Miembro de la Sociedad Española de Implantes (SEI)",
                  "Formación especializada en implantología basal en Europa",
                  "Clínica certificada con protocolo de carga inmediata",
                  "Más de 27 años de ejercicio ininterrumpido en Barcelona",
                ].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-start gap-3"
                    style={fadeUp(drRightVis, 0.3 + i * 0.10)}
                  >
                    <CheckCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{item}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => scrollTo(contactRef)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                  color: "#1a2744",
                  boxShadow: "0 8px 30px rgba(201,169,110,0.28)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 44px rgba(201,169,110,0.52)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 30px rgba(201,169,110,0.28)"; }}
              >
                Solicitar primera consulta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TESTIMONIOS
      ════════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: "#faf9f7" }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div ref={testHeadRef} className="text-center mb-16" style={fadeUp(testHeadVis)}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#c9a96e" }}>
              Testimonios
            </p>
            <h2 className="text-4xl md:text-5xl font-light mb-5" style={{ color: "#1a2744" }}>
              Lo que dicen<br />
              <span className="font-semibold">nuestros pacientes</span>
            </h2>
            <p className="max-w-md mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
              Más de 27 años de sonrisas restauradas hablan por sí solos.
            </p>
          </div>

          {/* Cards — staggered */}
          <div ref={testGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ name, treatment, stars, quote }, i) => (
              <div
                key={name}
                className="bg-white rounded-3xl p-8 flex flex-col"
                style={{
                  border: "1px solid #e8e2d9",
                  ...fadeUp(testGridVis, i * 0.15),
                  transition: `opacity 0.85s ${EASE} ${i * 0.15}s, transform 0.85s ${EASE} ${i * 0.15}s`,
                }}
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: stars }).map((_, si) => (
                    <Star key={si} size={14} fill="#c9a96e" style={{ color: "#c9a96e" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: "#374151" }}>
                  "{quote}"
                </p>
                <div className="flex items-center gap-3 pt-5" style={{ borderTop: "1px solid #f0ede8" }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}
                  >
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{name}</p>
                    <p className="text-xs" style={{ color: "#c9a96e" }}>{treatment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CONTACTO
      ════════════════════════════════════════════════════════ */}
      <section ref={contactRef} className="relative py-24 overflow-hidden">
        {/* Barcelona background */}
        <div className="absolute inset-0">
          <img src={UNSPLASH_CONTACT} alt="Barcelona" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(17,27,51,0.94) 0%, rgba(26,39,68,0.88) 60%, rgba(17,27,51,0.93) 100%)" }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header */}
          <div ref={ctaHeadRef} className="text-center mb-14" style={fadeUp(ctaHeadVis)}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#c9a96e" }}>
              Contáctenos
            </p>
            <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
              Dé el primer paso<br />
              <span className="font-semibold">hacia su nueva sonrisa</span>
            </h2>
            <p className="max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.50)" }}>
              Nuestro equipo está a su disposición para resolver todas sus dudas y programar su primera consulta.
            </p>
          </div>

          {/* Info cards — staggered from bottom */}
          <div ref={ctaCardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {[
              { icon: MapPin, label: "Dirección", lines: ["Calle de Sabino Arana 40", "1°, 2ª · 08028 Barcelona"] },
              { icon: Phone,  label: "Teléfono",  lines: ["+34 932 041 069", "Llamadas y WhatsApp"]           },
              { icon: Clock,  label: "Horario",   lines: ["Lunes – Viernes", "9:30 – 19:00 h"]                },
              { icon: Globe,  label: "Web",        lines: ["clinica-cotten.com", "info@clinica-cotten.com"]    },
            ].map(({ icon: Icon, label, lines }, i) => (
              <div
                key={label}
                className="p-6 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(8px)",
                  ...fadeUp(ctaCardsVis, i * 0.10),
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(201,169,110,0.15)" }}
                >
                  <Icon size={18} style={{ color: "#c9a96e" }} />
                </div>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</p>
                {lines.map(line => (
                  <p key={line} className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.80)" }}>{line}</p>
                ))}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="w-full sm:w-auto px-10 py-4 rounded-xl text-sm font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                color: "#1a2744",
                boxShadow: "0 8px 30px rgba(201,169,110,0.32)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 44px rgba(201,169,110,0.56)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 30px rgba(201,169,110,0.32)"; }}
            >
              Acceso Portal Paciente
            </button>
            <a
              href="tel:+34932041069"
              className="w-full sm:w-auto px-10 py-4 rounded-xl text-sm font-medium tracking-wide text-center"
              style={{
                border: "1px solid rgba(255,255,255,0.28)",
                color: "white",
                transition: "background 0.3s ease, border-color 0.3s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.50)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent";            e.currentTarget.style.borderColor="rgba(255,255,255,0.28)"; }}
            >
              Llamar ahora
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TREATMENT MODAL
      ════════════════════════════════════════════════════════ */}
      {activeModal && (
        <TreatmentModal
          treatment={activeModal}
          onClose={() => setActiveModal(null)}
          onContact={() => {
            setActiveModal(null);
            scrollTo(contactRef);
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#0d1526", borderTop: "1px solid rgba(201,169,110,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }}
              >
                <span className="text-white font-bold text-xs">CC</span>
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.80)" }}>Clínica Cotten</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>Dr. Philippe Cotten · Colegiado nº 08/123456</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              {navLinks.map(({ label, ref }) => (
                <button
                  key={label}
                  onClick={() => scrollTo(ref)}
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.32)", transition: "color 0.2s ease" }}
                  onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.32)"}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              <Shield size={11} />
              <span>© 2026 · Datos protegidos RGPD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
