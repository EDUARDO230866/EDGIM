// Biblioteca base. Cada ejercicio tiene dos variantes (índice 0 y 1).
// tier: 1 = de los más efectivos según la evidencia actual (rango completo,
// buena tensión en estiramiento, estable), 2 = muy bueno, 3 = accesorio.
const MUSCLES = [
  "Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps", "Cuádriceps",
  "Femoral", "Glúteo", "Pantorrilla", "Abdomen", "Trapecio", "Antebrazo",
];

const BASE_EXERCISES = [
  // Pecho
  { id: "press-banca", name: "Press de banca", muscle: "Pecho", variants: ["Barra", "Mancuerna"], tier: 1 },
  { id: "press-inclinado", name: "Press inclinado", muscle: "Pecho", variants: ["Barra", "Mancuerna"], tier: 1 },
  { id: "aperturas", name: "Aperturas", muscle: "Pecho", variants: ["Polea", "Mancuerna"], tier: 2 },
  { id: "cruce-poleas", name: "Cruce de poleas", muscle: "Pecho", variants: ["Polea alta", "Polea baja"], tier: 2 },
  { id: "press-maquina", name: "Press de pecho", muscle: "Pecho", variants: ["Máquina", "Smith"], tier: 1 },
  { id: "fondos", name: "Fondos", muscle: "Pecho", variants: ["Peso corporal", "Lastrado"], tier: 2 },
  { id: "pec-deck", name: "Pec deck", muscle: "Pecho", variants: ["Máquina", "Unilateral"], tier: 2 },
  // Espalda
  { id: "dominadas", name: "Dominadas", muscle: "Espalda", variants: ["Prono", "Supino"], tier: 1 },
  { id: "jalon", name: "Jalón al pecho", muscle: "Espalda", variants: ["Agarre ancho", "Agarre neutro"], tier: 1 },
  { id: "remo", name: "Remo inclinado", muscle: "Espalda", variants: ["Barra", "Mancuerna"], tier: 2 },
  { id: "remo-sentado", name: "Remo sentado", muscle: "Espalda", variants: ["Polea", "Máquina"], tier: 1 },
  { id: "remo-pecho-apoyado", name: "Remo con pecho apoyado", muscle: "Espalda", variants: ["Máquina", "Mancuerna"], tier: 1 },
  { id: "pullover", name: "Pullover", muscle: "Espalda", variants: ["Polea", "Mancuerna"], tier: 2 },
  { id: "peso-muerto", name: "Peso muerto", muscle: "Espalda", variants: ["Convencional", "Sumo"], tier: 2 },
  // Hombro
  { id: "press-militar", name: "Press militar", muscle: "Hombro", variants: ["Barra", "Mancuerna"], tier: 2 },
  { id: "press-hombro-maquina", name: "Press de hombro", muscle: "Hombro", variants: ["Máquina", "Smith"], tier: 1 },
  { id: "laterales", name: "Elevaciones laterales", muscle: "Hombro", variants: ["Mancuerna", "Polea"], tier: 1 },
  { id: "posteriores", name: "Elevaciones posteriores", muscle: "Hombro", variants: ["Mancuerna", "Polea"], tier: 2 },
  { id: "reverse-pec", name: "Reverse pec deck", muscle: "Hombro", variants: ["Máquina", "Unilateral"], tier: 1 },
  { id: "face-pull", name: "Face pull", muscle: "Hombro", variants: ["Polea", "Banda"], tier: 2 },
  { id: "frontales", name: "Elevaciones frontales", muscle: "Hombro", variants: ["Mancuerna", "Polea"], tier: 3 },
  // Bíceps
  { id: "curl-biceps", name: "Curl de bíceps", muscle: "Bíceps", variants: ["Libre", "Polea"], tier: 2 },
  { id: "curl-barra", name: "Curl con barra", muscle: "Bíceps", variants: ["Barra recta", "Barra Z"], tier: 2 },
  { id: "curl-martillo", name: "Curl martillo", muscle: "Bíceps", variants: ["Mancuerna", "Polea con cuerda"], tier: 2 },
  { id: "curl-predicador", name: "Curl predicador", muscle: "Bíceps", variants: ["Barra Z", "Máquina"], tier: 1 },
  { id: "curl-inclinado", name: "Curl inclinado", muscle: "Bíceps", variants: ["Mancuerna", "Polea"], tier: 1 },
  { id: "curl-bayesian", name: "Curl bayesian", muscle: "Bíceps", variants: ["Polea", "Polea unilateral"], tier: 1 },
  // Tríceps
  { id: "ext-polea", name: "Extensión de tríceps en polea", muscle: "Tríceps", variants: ["Cuerda", "Barra"], tier: 2 },
  { id: "ext-cabeza", name: "Extensión sobre la cabeza", muscle: "Tríceps", variants: ["Polea", "Mancuerna"], tier: 1 },
  { id: "press-frances", name: "Press francés", muscle: "Tríceps", variants: ["Barra Z", "Mancuerna"], tier: 1 },
  { id: "press-cerrado", name: "Press cerrado", muscle: "Tríceps", variants: ["Barra", "Smith"], tier: 2 },
  { id: "patada-triceps", name: "Patada de tríceps", muscle: "Tríceps", variants: ["Mancuerna", "Polea"], tier: 3 },
  // Cuádriceps
  { id: "sentadilla", name: "Sentadilla", muscle: "Cuádriceps", variants: ["Barra libre", "Smith"], tier: 1 },
  { id: "hack", name: "Hack squat", muscle: "Cuádriceps", variants: ["Máquina", "Péndulo"], tier: 1 },
  { id: "prensa", name: "Prensa", muscle: "Cuádriceps", variants: ["45°", "Horizontal"], tier: 1 },
  { id: "extension-cuad", name: "Extensión de cuádriceps", muscle: "Cuádriceps", variants: ["Bilateral", "Unilateral"], tier: 1 },
  { id: "bulgara", name: "Sentadilla búlgara", muscle: "Cuádriceps", variants: ["Mancuerna", "Smith"], tier: 1 },
  { id: "zancadas", name: "Zancadas", muscle: "Cuádriceps", variants: ["Mancuerna", "Barra"], tier: 2 },
  // Femoral
  { id: "rumano", name: "Peso muerto rumano", muscle: "Femoral", variants: ["Barra", "Mancuerna"], tier: 1 },
  { id: "curl-femoral", name: "Curl femoral", muscle: "Femoral", variants: ["Sentado", "Tumbado"], tier: 1 },
  { id: "nordico", name: "Curl nórdico", muscle: "Femoral", variants: ["Asistido", "Completo"], tier: 2 },
  // Glúteo
  { id: "hip-thrust", name: "Hip thrust", muscle: "Glúteo", variants: ["Barra", "Máquina"], tier: 2 },
  { id: "patada-gluteo", name: "Patada de glúteo", muscle: "Glúteo", variants: ["Polea", "Máquina"], tier: 3 },
  { id: "abduccion", name: "Abducción de cadera", muscle: "Glúteo", variants: ["Máquina", "Polea"], tier: 2 },
  // Pantorrilla
  { id: "talones", name: "Elevación de talones", muscle: "Pantorrilla", variants: ["De pie", "Sentado"], tier: 1 },
  { id: "talones-prensa", name: "Talones en prensa", muscle: "Pantorrilla", variants: ["Bilateral", "Unilateral"], tier: 2 },
  // Abdomen
  { id: "crunch", name: "Crunch", muscle: "Abdomen", variants: ["Polea", "Máquina"], tier: 1 },
  { id: "elev-piernas", name: "Elevación de piernas", muscle: "Abdomen", variants: ["Colgado", "En banco"], tier: 2 },
  { id: "plancha", name: "Plancha", muscle: "Abdomen", variants: ["Frontal", "Lateral"], tier: 3 },
  // Trapecio y antebrazo
  { id: "encogimientos", name: "Encogimientos", muscle: "Trapecio", variants: ["Barra", "Mancuerna"], tier: 2 },
  { id: "curl-muneca", name: "Curl de muñeca", muscle: "Antebrazo", variants: ["Barra", "Mancuerna"], tier: 2 },
];

// Alimentos por 100 g YA COCIDOS (salvo los marcados raw): kcal, proteína, carbos, grasa.
// cat: p = proteína, c = carbohidrato, f = grasa. unit/ug = se cuenta en piezas de ug gramos.
// snack: sirve para colaciones; snackOnly: solo en colaciones; cooked: el peso es ya cocido.
const FOODS = {
  pollo: { name: "Pechuga de pollo", cat: "p", k: 165, p: 31, c: 0, f: 3.6, cooked: true },
  pavo: { name: "Pechuga de pavo", cat: "p", k: 135, p: 30, c: 0, f: 1, cooked: true },
  res: { name: "Carne de res magra", cat: "p", k: 200, p: 29, c: 0, f: 9, cooked: true },
  cerdo: { name: "Lomo de cerdo", cat: "p", k: 187, p: 29, c: 0, f: 7, cooked: true },
  pescado: { name: "Pescado blanco", cat: "p", k: 128, p: 26, c: 0, f: 2.7, cooked: true },
  salmon: { name: "Salmón", cat: "p", k: 206, p: 22, c: 0, f: 12, cooked: true },
  atun: { name: "Atún en agua", cat: "p", k: 116, p: 26, c: 0, f: 1, snack: true },
  huevo: { name: "Huevo", cat: "p", k: 155, p: 13, c: 1.1, f: 11, unit: "pieza", ug: 50, snack: true },
  claras: { name: "Claras de huevo", cat: "p", k: 52, p: 11, c: 0.7, f: 0.2, cooked: true },
  yogur: { name: "Yogur griego natural", cat: "p", k: 97, p: 9, c: 3.6, f: 5, snack: true, snackOnly: true },
  cottage: { name: "Queso cottage", cat: "p", k: 98, p: 11, c: 3.4, f: 4.3, snack: true, snackOnly: true },
  whey: { name: "Proteína en polvo", cat: "p", k: 400, p: 80, c: 8, f: 6, unit: "scoop", ug: 30, snack: true, raw: true, snackOnly: true },
  tofu: { name: "Tofu firme", cat: "p", k: 144, p: 17, c: 3, f: 9 },
  arroz: { name: "Arroz", cat: "c", k: 130, p: 2.7, c: 28, f: 0.3, cooked: true },
  pasta: { name: "Pasta", cat: "c", k: 158, p: 5.8, c: 31, f: 0.9, cooked: true },
  papa: { name: "Papa", cat: "c", k: 87, p: 1.9, c: 20, f: 0.1, cooked: true },
  camote: { name: "Camote", cat: "c", k: 90, p: 2, c: 21, f: 0.1, cooked: true },
  frijoles: { name: "Frijoles", cat: "c", k: 127, p: 8.7, c: 23, f: 0.5, cooked: true },
  quinoa: { name: "Quinoa", cat: "c", k: 120, p: 4.4, c: 21, f: 1.9, cooked: true },
  avena: { name: "Avena (cocida en agua)", cat: "c", k: 71, p: 2.5, c: 12, f: 1.5, snack: true, cooked: true },
  tortilla: { name: "Tortilla de maíz", cat: "c", k: 218, p: 5.7, c: 45, f: 2.9, unit: "pieza", ug: 30 },
  tortillaHarina: { name: "Tortilla de harina", cat: "c", k: 310, p: 8, c: 50, f: 8, unit: "pieza", ug: 45 },
  pan: { name: "Pan integral", cat: "c", k: 247, p: 13, c: 41, f: 3.4, unit: "rebanada", ug: 30, snack: true },
  galletas: { name: "Galletas de arroz", cat: "c", k: 387, p: 8, c: 81, f: 2.8, unit: "pieza", ug: 9, snack: true, snackOnly: true },
  platano: { name: "Plátano", cat: "c", k: 89, p: 1.1, c: 23, f: 0.3, unit: "pieza", ug: 120, snack: true, snackOnly: true },
  manzana: { name: "Manzana", cat: "c", k: 52, p: 0.3, c: 14, f: 0.2, unit: "pieza", ug: 180, snack: true, snackOnly: true },
  aguacate: { name: "Aguacate", cat: "f", k: 160, p: 2, c: 9, f: 15 },
  aceite: { name: "Aceite de oliva", cat: "f", k: 884, p: 0, c: 0, f: 100, unit: "cucharadita", ug: 5 },
  cacahuate: { name: "Crema de cacahuate", cat: "f", k: 588, p: 25, c: 20, f: 50, unit: "cucharada", ug: 16, snack: true },
  nueces: { name: "Nueces o almendras", cat: "f", k: 620, p: 18, c: 16, f: 54, snack: true, snackOnly: true },
  queso: { name: "Queso panela", cat: "f", k: 260, p: 18, c: 3, f: 20 },
};
const MAIN_MEALS = ["Desayuno", "Comida", "Cena"];

// Biblioteca científica elegida por Claude: estudios y revisiones de referencia.
// El link abre la búsqueda del título en Google Scholar.
const SCI_LIB = [
  { id: "vol-2017", topic: "Volumen", title: "Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis", authors: "Schoenfeld, Ogborn y Krieger", year: 2017, journal: "Journal of Sports Sciences", finding: "Más series semanales por músculo producen más hipertrofia; 10 o más series por semana superan a menos de 5." },
  { id: "vol-2024", topic: "Volumen", title: "The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain", authors: "Pelland et al.", year: 2024, journal: "SportRxiv (preprint)", finding: "La hipertrofia sigue subiendo con más series, con rendimientos decrecientes; la frecuencia importa poco cuando el volumen es igual." },
  { id: "freq-2016", topic: "Frecuencia", title: "Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis", authors: "Schoenfeld, Ogborn y Krieger", year: 2016, journal: "Sports Medicine", finding: "Entrenar cada músculo al menos 2 veces por semana dio más hipertrofia que 1 vez." },
  { id: "load-2017", topic: "Repeticiones", title: "Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis", authors: "Schoenfeld, Grgic, Ogborn y Krieger", year: 2017, journal: "Journal of Strength and Conditioning Research", finding: "Cargas altas y bajas dan hipertrofia similar si se llega cerca del fallo; las altas ganan en fuerza." },
  { id: "rir-2024", topic: "Esfuerzo", title: "Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions", authors: "Robinson et al.", year: 2024, journal: "Sports Medicine", finding: "La hipertrofia mejora al acercarse al fallo (pocas repeticiones en reserva); la fuerza depende menos de eso." },
  { id: "rest-2016", topic: "Descanso", title: "Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men", authors: "Schoenfeld et al.", year: 2016, journal: "Journal of Strength and Conditioning Research", finding: "Descansar 3 minutos entre series dio más fuerza e hipertrofia que 1 minuto." },
  { id: "prog-2022", topic: "Progresión", title: "Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations", authors: "Plotkin et al.", year: 2022, journal: "PeerJ", finding: "Progresar subiendo repeticiones o subiendo peso dio hipertrofia similar." },
  { id: "ham-2021", topic: "Ejercicios", title: "Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths", authors: "Maeo et al.", year: 2021, journal: "Medicine & Science in Sports & Exercise", finding: "El curl femoral sentado (femoral estirado) hizo crecer más el femoral que el curl tumbado.", tags: ["Femoral"] },
  { id: "tri-2023", topic: "Ejercicios", title: "Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position", authors: "Maeo et al.", year: 2023, journal: "European Journal of Sport Science", finding: "Las extensiones de tríceps sobre la cabeza dieron bastante más crecimiento que en posición neutra.", tags: ["Tríceps"] },
  { id: "quad-2022", topic: "Ejercicios", title: "Partial range of motion training elicits favorable improvements in muscular adaptations when carried out at long muscle lengths", authors: "Pedrosa et al.", year: 2022, journal: "European Journal of Sport Science", finding: "En extensión de cuádriceps, trabajar en la parte estirada del movimiento dio más hipertrofia.", tags: ["Cuádriceps"] },
  { id: "calf-2023", topic: "Ejercicios", title: "Greater Gastrocnemius Muscle Hypertrophy After Partial Range of Motion Training Performed at Long Muscle Lengths", authors: "Kassiano et al.", year: 2023, journal: "Journal of Strength and Conditioning Research", finding: "Las pantorrillas crecieron más entrenando en la parte estirada (abajo) del movimiento.", tags: ["Pantorrilla"] },
  { id: "rom-2023", topic: "Ejercicios", title: "Partial Vs Full Range of Motion Resistance Training: A Systematic Review and Meta-Analysis", authors: "Wolf et al.", year: 2023, journal: "International Journal of Strength and Conditioning", finding: "Rango completo o parciales en la posición estirada son mejores que parciales en la posición corta." },
  { id: "deload-2024", topic: "Descarga", title: "Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations", authors: "Coleman et al.", year: 2024, journal: "PeerJ", finding: "Una semana de descarga a mitad del programa no frenó la hipertrofia; la fuerza en algunos ejercicios fue algo menor." },
  { id: "deload-2023", topic: "Descarga", title: "Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach", authors: "Bell et al.", year: 2023, journal: "Sports Medicine - Open", finding: "Consenso de expertos: descargar cada 4–8 semanas, unos 7 días, bajando sobre todo el volumen y el esfuerzo." },
  { id: "prot-2018", topic: "Nutrición", title: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults", authors: "Morton et al.", year: 2018, journal: "British Journal of Sports Medicine", finding: "El beneficio de la proteína se estabiliza cerca de 1.6 g/kg/día (hasta ~2.2 g/kg para cubrir a casi todos)." },
  { id: "cut-2014", topic: "Nutrición", title: "Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation", authors: "Helms, Aragon y Fitschen", year: 2014, journal: "Journal of the International Society of Sports Nutrition", finding: "En déficit: 2.3–3.1 g de proteína por kg de masa magra y perder 0.5–1% del peso por semana." },
  { id: "steps-2022", topic: "Cardio", title: "Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts", authors: "Paluch et al.", year: 2022, journal: "The Lancet Public Health", finding: "El beneficio de los pasos se estabiliza en ~8,000–10,000 al día en menores de 60 años y ~6,000–8,000 en mayores." },
  { id: "who-2020", topic: "Cardio", title: "World Health Organization 2020 guidelines on physical activity and sedentary behaviour", authors: "Bull et al.", year: 2020, journal: "British Journal of Sports Medicine", finding: "Adultos: 150–300 min por semana de actividad aeróbica moderada (≈30 min al día) más fuerza 2 días." },
  { id: "conc-2012", topic: "Cardio", title: "Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises", authors: "Wilson et al.", year: 2012, journal: "Journal of Strength and Conditioning Research", finding: "El cardio interfiere poco con la hipertrofia si es moderado; correr interfiere más que la bici." },
];
