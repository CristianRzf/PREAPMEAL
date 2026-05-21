const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");
const XLSX = require("xlsx");
 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
 
function parsearIngredientes(ingredientesTexto, preciosTexto) {
  if (!ingredientesTexto) return [];
  const ings = ingredientesTexto.split(";").map((i) => i.trim());
  const precios = preciosTexto
    ? preciosTexto.split(";").map((p) => parseInt(p.trim()) || 0)
    : [];
  return ings.map((item, i) => {
    const partes = item.split(" ");
    return {
      nombre: partes[0] || "",
      cantidad: parseFloat(partes[1]) || 0,
      unidad: partes[2] || "",
      precio: precios[i] || 0,
    };
  });
}
 
function parsearInstrucciones(texto) {
  if (!texto) return [];
  return texto.split(";").map((paso, i) => ({
    numero: i + 1,
    texto: paso.trim(),
  }));
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
 
  const workbook = XLSX.readFile("./recetasColombianas.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(sheet);
  console.log(`${filas.length} recetas encontradas en el Excel`);
 
  const existentes = await db.collection("recipes")
    .where("userId", "==", "system")
    .where("fuente", "==", "colombiana")
    .get();
  const titulosExistentes = new Set(existentes.docs.map((d) => d.data().titulo));
  console.log(`${titulosExistentes.size} recetas colombianas ya en Firestore`);
 
  let exitosas = 0;
  let duplicadas = 0;
  let fallidas = 0;
 
  for (const fila of filas) {
    const titulo = fila.titulo?.trim();
    if (!titulo) continue;
 
    if (titulosExistentes.has(titulo)) {
      console.log(`Ya existe: ${titulo}, saltando`);
      duplicadas++;
      continue;
    }
 
    try {
      const ingredientes = parsearIngredientes(fila.ingredientes, fila.precios);
      const totalEstimado = ingredientes.reduce((a, i) => a + i.precio, 0);
 
      await db.collection("recipes").add({
        tipo: "seed",
        fuente: "colombiana",
        userId: "system",
        username: "MealPrep Pro",
        creadoEn: admin.firestore.FieldValue.serverTimestamp(),
        titulo,
        nombre: titulo,
        descripcion: "",
        imagen: fila.imagen?.trim() || "",
        calorias: Number(fila.calorias) || 0,
        proteinas: Number(fila.proteinas) || 0,
        carbohidratos: Number(fila.carbohidratos) || 0,
        grasas: Number(fila.grasas) || 0,
        tiempo: Number(fila.tiempo) || 30,
        dificultad: fila.dificultad?.trim() || "facil",
        porciones: Number(fila.porciones) || 2,
        mealType: fila.mealType?.trim() || "almuerzo",
        tipo_array: [fila.mealType?.trim() || "almuerzo"],
        ingredientes,
        instrucciones: parsearInstrucciones(fila.instrucciones),
        totalEstimado,
        vegetariano: false,
        vegano: false,
        sinGluten: false,
      });
      console.log(`Subida: ${titulo} (estimado: $${totalEstimado.toLocaleString("es-CO")})`);
      exitosas++;
    } catch (err) {
      console.log(`Error con ${titulo}: ${err.message}`);
      fallidas++;
    }
  }
 
  const total = await db.collection("recipes").where("fuente", "==", "colombiana").get();
  console.log(`\nCompletado - Nuevas: ${exitosas} / Duplicadas: ${duplicadas} / Fallidas: ${fallidas}`);
  console.log(`Total recetas colombianas en Firestore: ${total.size}`);
  process.exit(0);
}
 
main().catch((err) => { console.error(err); process.exit(1); });
 