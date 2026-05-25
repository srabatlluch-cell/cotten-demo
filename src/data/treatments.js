import {
  Shield, Zap, Award, CheckCircle,
  Microscope, Heart, CalendarCheck,
  ScanLine, Layers, Users, Target,
  Sparkles, Star, Activity, Smile,
  Eye, Stethoscope,
} from "lucide-react";

export const TREATMENTS = {
  "implantologia-basal": {
    slug: "implantologia-basal",
    title: "Implantología Basal",
    tag: "Especialidad principal",
    heroSubtitle: "Implantes sin injerto óseo. Pioneros en España desde 2004.",
    intro: "La implantología basal es una técnica revolucionaria que permite colocar implantes dentales en pacientes que han perdido hueso, sin necesidad de injertos óseos. El Dr. Philippe Cotten introdujo esta técnica en España en 2004 y lleva más de 27 años devolviéndole la sonrisa a sus pacientes. El hueso basal, extremadamente denso y menos propenso a la reabsorción, permite fijar los implantes con firmeza incluso en casos de déficit óseo severo.",
    stats: [
      { value: "27+",   label: "Años de experiencia"   },
      { value: "+1.000",label: "Pacientes tratados"    },
      { value: "0",     label: "Injertos necesarios"   },
      { value: "72 h",  label: "Para tener dientes"    },
    ],
    benefits: [
      { icon: Shield,      title: "Sin injerto óseo",           desc: "No se extrae hueso del cráneo, cadera o mentón. Procedimiento menos invasivo y más rápido." },
      { icon: Zap,         title: "Carga inmediata",            desc: "Sus nuevos dientes en 48-72 horas tras la cirugía. Prótesis fija provisional desde el primer día." },
      { icon: CheckCircle, title: "Para cualquier nivel óseo",  desc: "Funciona incluso con pérdida ósea severa donde la implantología convencional no es posible." },
      { icon: Award,       title: "Alta tasa de éxito",         desc: "El hueso basal es más denso y menos propenso a infecciones. Menos complicaciones postoperatorias." },
    ],
    steps: [
      { title: "Diagnóstico y escáner 3D",  desc: "Estudio completo de su caso con radiología y escáner en 3D para planificación precisa." },
      { title: "Planificación quirúrgica",  desc: "El Dr. Cotten diseña el plan de tratamiento personalizado según su anatomía ósea." },
      { title: "Cirugía de implantes",      desc: "Colocación de implantes basales con anclaje en hueso cortical. Sin injertos, sin suturas en la mayoría de casos." },
      { title: "Prótesis en 72 horas",      desc: "Colocación del puente provisional fijo a las 48-72 horas. Prótesis definitiva de zirconio a los 3-5 meses." },
    ],
    faqs: [
      {
        q: "¿Soy candidato si me han dicho que no tengo hueso suficiente?",
        a: "Sí. La implantología basal está especialmente diseñada para pacientes con déficit óseo severo donde los implantes convencionales no son posibles. El Dr. Cotten ha tratado con éxito miles de casos que otros especialistas consideraron imposibles.",
      },
      {
        q: "¿Cuánto tiempo dura el tratamiento completo?",
        a: "La cirugía se realiza en un día. A las 48-72 horas tiene una prótesis fija provisional. La prótesis definitiva de zirconio se coloca a los 3-5 meses, cuando los implantes están perfectamente oseointegrados.",
      },
      {
        q: "¿Es doloroso el procedimiento?",
        a: "El procedimiento se realiza bajo anestesia local. La recuperación es más rápida que con cirugías con injertos, con menos molestias postoperatorias en la mayoría de casos.",
      },
      {
        q: "¿Cuánto cuesta la implantología basal?",
        a: "Cada caso es único. Le invitamos a una consulta gratuita donde el Dr. Cotten evaluará su caso y le presentará un presupuesto personalizado.",
      },
    ],
  },

  "periodoncia": {
    slug: "periodoncia",
    title: "Periodoncia",
    tag: "Salud gingival",
    heroSubtitle: "Salud de encías. Tratamiento especializado de la periodontitis.",
    intro: "La periodontitis es una infección grave de las encías que daña el tejido blando y destruye el hueso que sostiene los dientes. Sin tratamiento, puede provocar la pérdida de piezas dentales. En Clínica Cotten ofrecemos tratamientos periodontales avanzados para detener la progresión de la enfermedad y recuperar la salud de sus encías.",
    stats: [
      { value: "Preciso",  label: "Diagnóstico con microscopio" },
      { value: "No inv.",  label: "Tratamiento no invasivo"     },
      { value: "Duradero", label: "Resultados a largo plazo"    },
      { value: "100%",     label: "Seguimiento personalizado"   },
    ],
    benefits: [
      { icon: Microscope,    title: "Diagnóstico con microscopio", desc: "Utilizamos microscopio para diagnósticos precisos y seguimiento post-quirúrgico detallado." },
      { icon: Heart,         title: "Tratamiento no invasivo",     desc: "Priorizamos técnicas conservadoras para preservar el máximo tejido sano." },
      { icon: CalendarCheck, title: "Mantenimiento a largo plazo", desc: "Programa de mantenimiento periodontal personalizado para prevenir recaídas." },
      { icon: Stethoscope,   title: "Coordinación con implantología", desc: "Si pierde dientes por periodontitis, coordinamos con el equipo de implantología para su reposición." },
    ],
    steps: [
      { title: "Exploración periodontal",       desc: "Medición de bolsas periodontales, radiografías y estudio del estado de las encías." },
      { title: "Higiene profesional profunda",  desc: "Eliminación de placa y sarro subgingival mediante raspado y alisado radicular." },
      { title: "Cirugía periodontal",           desc: "En casos avanzados, intervención quirúrgica para acceder a zonas profundas." },
      { title: "Mantenimiento periodontal",     desc: "Visitas de control periódicas para mantener los resultados y prevenir recaídas." },
    ],
    faqs: [
      {
        q: "¿Cómo sé si tengo periodontitis?",
        a: "Los signos más frecuentes son encías que sangran al cepillarse, mal aliento persistente, encías retraídas, dientes que se mueven o sensibilidad dental. Ante cualquiera de estos síntomas, consulte a su especialista.",
      },
      {
        q: "¿La periodontitis tiene cura?",
        a: "La periodontitis no tiene cura completa pero sí se puede controlar. Con tratamiento adecuado y mantenimiento regular, se puede detener su progresión y conservar los dientes durante décadas.",
      },
      {
        q: "¿Es hereditaria la periodontitis?",
        a: "Existe un componente genético que aumenta la predisposición, pero la higiene oral y el control regular son los factores más importantes para su prevención y control.",
      },
    ],
  },

  "ortodoncia": {
    slug: "ortodoncia",
    title: "Ortodoncia",
    tag: "Alineación dental",
    heroSubtitle: "Corregimos la posición de tus dientes para una sonrisa perfecta y funcional.",
    intro: "La ortodoncia no es solo estética. Una mordida correcta mejora la masticación, reduce el desgaste dental, previene problemas de articulación mandibular y facilita la higiene oral. En Clínica Cotten ofrecemos soluciones ortodónticas para adultos, adolescentes y niños, con tecnología de última generación.",
    stats: [
      { value: "Niños+",   label: "Y adultos sin límite de edad" },
      { value: "2",        label: "Opciones: brackets/alineadores"},
      { value: "Permanente",label: "Resultados con retención"    },
      { value: "Mensual",  label: "Seguimiento personalizado"    },
    ],
    benefits: [
      { icon: Users,   title: "Ortodoncia para adultos",    desc: "Nunca es tarde para tener una sonrisa alineada. Disponemos de opciones discretas para adultos." },
      { icon: ScanLine,title: "Alineadores invisibles",    desc: "Alternativa estética a los brackets tradicionales. Removibles y prácticamente invisibles." },
      { icon: Layers,  title: "Brackets estéticos",        desc: "Brackets de cerámica del color del diente para mayor discreción durante el tratamiento." },
      { icon: Target,  title: "Coordinación multidisciplinar", desc: "Trabajamos coordinados con el equipo de implantología y periodoncia para tratamientos integrales." },
    ],
    steps: [
      { title: "Estudio ortodóntico",    desc: "Fotos, radiografías panorámicas y cefalométricas, modelos digitales para planificación precisa del movimiento dental." },
      { title: "Plan de tratamiento",    desc: "El especialista explica el movimiento planificado, duración estimada y opciones disponibles (brackets o alineadores)." },
      { title: "Colocación del aparato", desc: "Brackets o entrega de alineadores. Inicio del movimiento dental controlado." },
      { title: "Controles y retención",  desc: "Visitas mensuales de control. Al finalizar, retenedores para mantener el resultado de por vida." },
    ],
    faqs: [
      {
        q: "¿A qué edad se puede empezar la ortodoncia?",
        a: "La primera revisión ortodóntica se recomienda a los 6-7 años. Los tratamientos correctivos suelen iniciarse entre los 10-14 años. En adultos no hay límite de edad.",
      },
      {
        q: "¿Cuánto dura el tratamiento?",
        a: "Depende de la complejidad del caso. Casos simples pueden resolverse en 6-12 meses. Casos moderados o severos suelen requerir 18-24 meses.",
      },
      {
        q: "¿Son mejores los alineadores o los brackets?",
        a: "Depende del caso. Los alineadores son ideales para correcciones moderadas en adultos que valoran la estética. Los brackets ofrecen más control para casos complejos o pacientes en crecimiento.",
      },
    ],
  },

  "estetica-dental": {
    slug: "estetica-dental",
    title: "Estética Dental",
    tag: "Sonrisa perfecta",
    heroSubtitle: "Transformamos tu sonrisa con los últimos avances en estética dental.",
    intro: "Una sonrisa bonita impacta directamente en tu confianza y calidad de vida. En Clínica Cotten combinamos arte y ciencia para diseñar sonrisas naturales, armoniosas y duraderas, perfectamente adaptadas a los rasgos de cada paciente. Desde un blanqueamiento hasta un cambio completo con carillas de porcelana.",
    stats: [
      { value: "Digital",  label: "Diseño previo a cualquier toque" },
      { value: "Natural",  label: "Resultados no artificiales"       },
      { value: "Premium",  label: "Materiales cerámicos de élite"    },
      { value: "Sin dolor",label: "Procedimientos mínimamente invasivos" },
    ],
    benefits: [
      { icon: Eye,      title: "Diseño de sonrisa digital",  desc: "Antes de cualquier tratamiento, visualiza cómo quedará tu nueva sonrisa mediante simulación digital." },
      { icon: Sparkles, title: "Carillas de porcelana",      desc: "Láminas ultrafinas de cerámica que transforman el color, forma y tamaño de los dientes. Resultados espectaculares y duraderos." },
      { icon: Zap,      title: "Blanqueamiento profesional", desc: "Resultados hasta 8 tonos más claros en una sola sesión. Mucho más eficaz y seguro que los kits domésticos." },
      { icon: Star,     title: "Composite dental",           desc: "Corrección de pequeños defectos (diastemas, fracturas, decoloraciones) sin desgaste del diente natural." },
    ],
    steps: [
      { title: "Análisis estético",      desc: "Estudio facial, análisis de la sonrisa y simulación digital del resultado final antes de empezar." },
      { title: "Plan de tratamiento",    desc: "Presentación de opciones (blanqueamiento, carillas, composite) con presupuesto y plazos detallados." },
      { title: "Tratamiento",            desc: "Realización del tratamiento seleccionado con materiales de primera calidad y técnica depurada." },
      { title: "Resultado y mantenimiento", desc: "Entrega de su nueva sonrisa con instrucciones de mantenimiento para prolongar los resultados." },
    ],
    faqs: [
      {
        q: "¿Cuánto duran las carillas de porcelana?",
        a: "Las carillas de porcelana de calidad duran entre 10-20 años con un mantenimiento adecuado. Son resistentes a las manchas y mantienen su brillo natural.",
      },
      {
        q: "¿El blanqueamiento daña los dientes?",
        a: "El blanqueamiento profesional supervisado por un dentista es seguro. Puede haber sensibilidad temporal durante el tratamiento, que desaparece al finalizarlo.",
      },
      {
        q: "¿Necesito carillas o basta con un blanqueamiento?",
        a: "Depende de lo que quieras corregir. Si solo deseas un tono más blanco, el blanqueamiento es suficiente. Las carillas están indicadas cuando también quieres cambiar la forma, el tamaño o corregir irregularidades.",
      },
    ],
  },
};