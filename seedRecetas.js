const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");
 
const SPOONACULAR_API_KEY = "Api key";
 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
 
let myMemoryAgotado = false;
let lingvaAgotado = false;
 
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
 
async function traducirConMyMemory(texto) {
  if (myMemoryAgotado) return null;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto.slice(0, 500))}&langpair=en|es`;
    const res = await fetch(url);
    const data = await res.json();
    const traducido = data?.responseData?.translatedText || "";
    if (traducido.startsWith("MYMEMORY WARNING")) {
      myMemoryAgotado = true;
      return null;
    }
    return traducido || null;
  } catch {
    return null;
  }
}
 
async function traducirConLingva(texto) {
  if (lingvaAgotado) return null;
  try {
    const res = await fetch("https://lingva.ml/api/v1/en/es/" + encodeURIComponent(texto.slice(0, 500)));
    if (!res.ok) { lingvaAgotado = true; return null; }
    const data = await res.json();
    return data?.translation || null;
  } catch {
    lingvaAgotado = true;
    return null;
  }
}
 
async function traducirConLibreTranslate(texto) {
  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texto.slice(0, 500), source: "en", target: "es", format: "text" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.translatedText || null;
  } catch {
    return null;
  }
}
 
async function traducir(texto) {
  if (!texto) return "";
  if (!myMemoryAgotado) {
    const r = await traducirConMyMemory(texto);
    if (r) return r;
    await sleep(300);
  }
  if (!lingvaAgotado) {
    const r = await traducirConLingva(texto);
    if (r) return r;
    await sleep(300);
  }
  const r = await traducirConLibreTranslate(texto);
  if (r) return r;
  return texto;
}
 
function calcularDificultad(minutos, pasos) {
  if (minutos <= 20 && pasos <= 5) return "facil";
  if (minutos <= 45 && pasos <= 10) return "intermedio";
  return "dificil";
}
 
async function obtenerAlmuerzos() {
  const url =
    `https://api.spoonacular.com/recipes/complexSearch` +
    `?apiKey=${SPOONACULAR_API_KEY}` +
    `&type=main+course` +
    `&number=10` +
    `&addRecipeNutrition=true` +
    `&instructionsRequired=true` +
    `&fillIngredients=true`;
  const res = await fetch(url);
  if (!res.ok) { console.error("Error Spoonacular:", res.status); process.exit(1); }
  const data = await res.json();
  return (data.results || []).map((r) => r.id);
}
 
async function obtenerDetalle(id) {
  const url =
    `https://api.spoonacular.com/recipes/${id}/information` +
    `?apiKey=${SPOONACULAR_API_KEY}` +
    `&includeNutrition=true`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}
 
async function procesarReceta(id) {
  const detalle = await obtenerDetalle(id);
  if (!detalle) return null;
 
  const nutricion = detalle.nutrition?.nutrients || [];
  const getNut = (name) => Math.round(nutricion.find((n) => n.name === name)?.amount || 0);
 
  const calorias      = getNut("Calories");
  const proteinas     = getNut("Protein");
  const carbohidratos = getNut("Carbohydrates");
  const grasas        = getNut("Fat");
 
  const titulo = await traducir(detalle.title || "");
  await sleep(400);
 
  const descripcionRaw = detalle.summary ? detalle.summary.replace(/<[^>]*>/g, "").slice(0, 500) : "";
  const descripcion = await traducir(descripcionRaw);
  await sleep(400);
 
  const instruccionesRaw = detalle.analyzedInstructions?.[0]?.steps?.slice(0, 8) || [];
  const instrucciones = [];
  for (const paso of instruccionesRaw) {
    instrucciones.push({ numero: paso.number, texto: await traducir(paso.step || "") });
    await sleep(250);
  }
 
  const ingredientes = [];
  for (const ing of (detalle.extendedIngredients || []).slice(0, 15)) {
    ingredientes.push({
      nombre: await traducir(ing.name || ""),
      cantidad: Math.round((ing.amount || 0) * 10) / 10,
      unidad: ing.unit || "",
      precio: 0,
    });
    await sleep(200);
  }
 
  return {
    tipo: "seed",
    userId: "system",
    username: "MealPrep Pro",
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
    spoonacularId: id,
    titulo,
    nombre: titulo,
    descripcion,
    imagen: detalle.image || "",
    calorias,
    proteinas,
    carbohidratos,
    grasas,
    tiempo: detalle.readyInMinutes || 30,
    dificultad: calcularDificultad(detalle.readyInMinutes || 30, instruccionesRaw.length),
    porciones: detalle.servings || 2,
    mealType: "almuerzo",
    tipo_array: ["almuerzo"],
    ingredientes,
    instrucciones,
    vegetariano: detalle.vegetarian || false,
    vegano: detalle.vegan || false,
    sinGluten: detalle.glutenFree || false,
  };
}
 
async function main() {
  console.log("Conectando con Firebase...");
  try {
    await db.collection("recipes").limit(1).get();
    console.log("Firebase conectado");
  } catch (err) {
    console.error("Error Firebase:", err.message);
    process.exit(1);
  }
 
  const existentes = await db.collection("recipes")
    .where("userId", "==", "system")
    .where("mealType", "==", "almuerzo")
    .get();
 
  if (!existentes.empty) {
    console.log(`Ya existen ${existentes.size} almuerzos. Eliminalos primero desde Firebase Console.`);
    process.exit(0);
  }
 
  const ids = await obtenerAlmuerzos();
  console.log(`${ids.length} recetas encontradas`);
  await sleep(500);
 
  let exitosas = 0;
  let fallidas = 0;
 
  for (let i = 0; i < ids.length; i++) {
    console.log(`[${i + 1}/${ids.length}] Procesando ${ids[i]}...`);
    try {
      const receta = await procesarReceta(ids[i]);
      if (!receta) { console.log("Sin datos, saltando"); fallidas++; continue; }
      await db.collection("recipes").add(receta);
      console.log(`Subida: ${receta.titulo.slice(0, 40)}`);
      exitosas++;
    } catch (err) {
      console.log("Error:", err.message);
      fallidas++;
    }
    await sleep(1000);
  }
 
  console.log(`Completado - Subidas: ${exitosas} / Fallidas: ${fallidas}`);
  process.exit(0);
}
 
main().catch((err) => { console.error(err); process.exit(1); });