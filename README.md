# 🍽️ MealPrep Pro  
## Tu Chef Personal Inteligente

---

## 1. INTRODUCCIÓN

MealPrep Pro es una aplicación móvil multiplataforma diseñada para simplificar la planificación de comidas, la gestión de compras y el control nutricional y financiero para personas ocupadas, especialmente estudiantes universitarios y jóvenes profesionales.

---

## 1.1 Objetivos del Proyecto

- Desarrollar una aplicación móvil funcional que simplifique la planificación de comidas  
- Crear biblioteca de **80–100 recetas** con información nutricional completa  
- Implementar sistema de generación automática de listas de compras  
- Desarrollar módulo de gestión de inventario con alertas de vencimiento  
- Implementar dashboard nutricional personalizado  
- Agregar módulo de control financiero de gastos en comida  
- Entregar aplicación estable y profesional lista para demostración  

---

## 2. RESUMEN 

**Nombre del Proyecto:** MealPrep Pro – Tu Chef Personal Inteligente  

**Descripción:**  
Aplicación móvil que permite a usuarios planificar comidas semanales, generar listas de compras automáticas, acceder a recetas saludables con información nutricional, gestionar inventario de alimentos y controlar gastos en comida.

### Stack Tecnológico

- **Frontend:** React Native con TypeScript  
- **Backend:** Firebase (Backend as a Service)  
- **Base de Datos:** Cloud Firestore (NoSQL)  
- **Autenticación:** Firebase Authentication  
- **Almacenamiento:** Firebase Storage  
- **State Management:** Redux Toolkit  
- **UI Framework:** React Native Paper (Material Design)  

**Alcance:**  
MVP completo con **8 módulos principales funcionales** en **3 meses**.

---

## 3. REQUERIMIENTOS FUNCIONALES (RF)
**RF-01: AUTENTICACIÓN Y PERFIL DE USUARIO**

*RF-01.1: Registro de Usuario*
- RF-01.1.1: El sistema debe permitir registro con email y contraseña, validando formato de email y contraseña
mínimo 6 caracteres
- RF-01.1.2: El sistema debe validar que el email no esté ya registrado con mensaje de error claro
- RF-01.1.3: El usuario debe proporcionar nombre completo al registrarse (campo obligatorio, mínimo 2
caracteres)
- RF-01.1.4: Al registrarse, el sistema debe crear documento de usuario en Firestore con email, displayName y
createdAt

*RF-01.2: Inicio de Sesión (Login)*

- RF-01.2.1: El sistema debe permitir login con email y contraseña verificadas por Firebase Auth
- RF-01.2.2: Mostrar mensajes de error claros según tipo de fallo (email no encontrado, contraseña incorrecta)
- RF-01.2.3: La sesión debe persistir entre cierres de app con token válido por 30 días

*RF-01.3: Recuperación de Contraseña*
- RF-01.3.1: El sistema debe permitir resetear contraseña por email mediante Firebase Auth

*RF-01.4: Configuración de Perfil Nutricional*

- RF-01.4.1: El usuario debe poder configurar datos personales: edad, sexo, peso, altura, nivel de actividad
física
- RF-01.4.2: El usuario debe seleccionar objetivo nutricional: mantener/perder/ganar peso/masa muscular
- RF-01.4.3: El sistema debe calcular automáticamente TDEE usando fórmula Mifflin-St Jeor
- RF-01.4.4: El sistema debe calcular requerimientos de macronutrientes (proteínas: 2g/kg, grasas: 25%,
carbohidratos: resto)
- RF-01.4.5: El usuario debe poder especificar alergias e intolerancias con lista de checkboxes

---

**RF-02: Gestión de Recetas**

*RF-02.1: Biblioteca de Recetas*

- RF-02.1.1: El sistema debe mostrar biblioteca de recetas con vista de lista/grid, mostrando imagen, nombre,
rating, tiempo, calorías
- RF-02.1.2: El sistema debe incluir mínimo 80 recetas precargadas con variedad de tipos y dificultades
- RF-02.1.3: Cada receta debe contener: nombre, descripción, imagen, tiempos, porciones, dificultad, tipos de
comida, tags dietéticos, ingredientes con cantidades, instrucciones paso a paso, información nutricional
completa, costo estimado

*RF-02.2: Búsqueda de Recetas*
- RF-02.2.1: El usuario debe poder buscar recetas por texto (nombre o ingrediente) con resultados en tiempo
real

*RF-02.3: Filtros de Recetas*
- RF-02.3.1: El usuario debe poder filtrar recetas por tipo de comida (desayuno/almuerzo/cena/snack)
- RF-02.3.2: El usuario debe poder filtrar por tiempo de preparación con slider de rango 0-120+ min
- RF-02.3.3: El usuario debe poder filtrar por preferencias dietéticas (vegetariano/vegano/sin gluten/keto/alto en
proteína)
- RF-02.3.4: El usuario debe poder filtrar por nivel de dificultad (fácil/intermedio/difícil)
- RF-02.3.5: El usuario debe poder filtrar por rango de calorías con slider
- RF-02.3.6: El usuario debe poder filtrar por precio (económico/moderado/costoso)
- RF-02.3.7: El sistema debe aplicar múltiples filtros simultáneamente

*RF-02.5: Detalle de Receta*
- RF-02.5.1: Al seleccionar receta, abrir pantalla con imagen grande, nombre, rating, tiempo, porciones,
dificultad y tags
- RF-02.5.2: Mostrar sección de información nutricional destacada por porción
- RF-02.5.3: Mostrar sección de costo estimado (total y por porción) con tag de categoría de precio
- RF-02.5.4: Mostrar lista de ingredientes con opción de ajustar porciones (recalcula cantidades
automáticamente)
- RF-02.5.5: Mostrar instrucciones paso a paso numeradas
- RF-02.5.6: Botón principal 'Agregar a mi semana' que abre modal de selección de día/comida

*RF-02.6: Favoritos*
- RF-02.6.1: El usuario debe poder marcar/desmarcar recetas como favoritas con ícono de corazón
- RF-02.6.2: El sistema debe guardar favoritos en Firestore (users/{userId}/favorites/{recipeId})
- RF-02.6.3: El usuario debe poder ver lista de recetas favoritas

---

**RF-03: Planificador Semanal**

*RF-03.1: Vista de Calendario Semanal*
- RF-03.1.1: El sistema debe mostrar calendario de 7 días con slots de comidas
(desayuno/almuerzo/cena/snacks)
- RF-03.1.2: El usuario debe poder navegar entre semanas con botones anterior/siguiente
- RF-03.1.3: Cada slot debe mostrar imagen thumbnail, nombre, calorías y menú de opciones cuando tiene
receta
- RF-03.1.4: El sistema debe mostrar resumen nutricional por día (calorías totales, barra de progreso, macros
con código de colores)
- RF-03.1.5: El sistema debe mostrar resumen semanal con promedio de calorías, proteínas totales, días
completos vs vacíos

*RF-03.2: Agregar Receta al Plan*
- RF-03.2.1: Al presionar '+ Agregar receta', abrir modal de búsqueda con biblioteca completa y filtros
- RF-03.2.2: Modal de configuración debe permitir seleccionar número de porciones (1-10) con preview
nutricional ajustado
- RF-03.2.3: Al confirmar, guardar en Firestore y actualizar UI inmediatamente con recálculo nutricional

*RF-03.3: Editar Receta en el Plan*
- RF-03.3.1: Al presionar menú [...], mostrar opciones: cambiar porciones, reemplazar receta, mover, eliminar
- RF-03.3.2: Opción 'Cambiar porciones' abre modal con slider y preview nutricional
- RF-03.3.3: Opción 'Reemplazar receta' abre búsqueda y reemplaza en mismo slot
- RF-03.3.4: Opción 'Mover' abre selector de día/comida con confirmación si destino está ocupado
- RF-03.3.5: Opción 'Eliminar' requiere confirmación y recalcula resumen nutricional

*RF-03.4: Generar Lista de Compras*
- RF-03.4.1: Botón 'Generar Lista de Compras' visible en calendario (requiere mínimo 1 receta)
- RF-03.4.2: Al presionar, el sistema debe: extraer ingredientes, ajustar cantidades, consolidar repetidos,
agrupar por sección, crear en Firestore y navegar a pantalla de lista

---

**RF-04: Lista de Compras**

*RF-04.1: Vista de Lista de Compras*
- RF-04.1.1: El sistema debe mostrar header con título, total estimado y progreso (X/Y items comprados)
- RF-04.1.2: Items agrupados por 8 secciones de supermercado (frutas, carnes, lácteos, panadería, enlatados,
granos, condimentos, congelados)
- RF-04.1.3: Cada item muestra: checkbox, nombre, cantidad/unidad, precio estimado, origen (de qué recetas)
- RF-04.1.4: Items marcados se tachan, reducen opacidad 50% y opcionalmente se mueven al final

*RF-04.2: Interacciones con Items*
- RF-04.2.1: Tap en checkbox marca/desmarca con actualización inmediata en Firestore
- RF-04.2.2: Long press o swipe right abre edición de nombre, cantidad, unidad y precio
- RF-04.2.3: Swipe left muestra botón 'Eliminar' con confirmación y recálculo de total
- RF-04.2.4: Botón '+' permite agregar items manualmente con formulario completo

*RF-04.3: Completar Compras*
- RF-04.3.1: Botón 'Completar Compras' disponible cuando >50% items están marcados
- RF-04.3.2: Al completar, modal pregunta '¿Cuánto gastaste?' mostrando comparación estimado vs real en vivo
- RF-04.3.3: Al guardar: crea transacción en expense_tracking, marca lista como completada, opcionalmente
sugiere agregar items a inventario

---

**RF-05: Gestión de Inventario**

*RF-05.1: Vista de Inventario*
- RF-05.1.1: El sistema debe mostrar items agrupados por ubicación (refrigerador/despensa/congelador)
expandibles/colapsables
- RF-05.1.2: Cada item muestra: nombre, cantidad/unidad, fecha de vencimiento, estado visual con código de
colores (n fresco >7 días, n por vencer 3-7 días, n próximo <3 días, n vencido)
- RF-05.1.3: Items ordenados por urgencia (más próximos a vencer primero)

*RF-05.2: Agregar Item al Inventario*
- RF-05.2.1: Botón '+' abre formulario con: nombre (requerido), cantidad (requerido), unidad, ubicación, fecha de
vencimiento (requerido), categoría, notas
- RF-05.2.2: Al guardar, crear documento en Firestore users/{userId}/pantry_inventory/{itemId}
- RF-05.2.3: Sugerencia opcional al completar lista de compras: '¿Agregar estos items a inventario?'

*RF-05.3: Editar Item del Inventario*
- RF-05.3.1: Al presionar item, abrir detalle/edición con todos los campos editables
- RF-05.3.2: Opción 'Marcar como usado/consumido' elimina del inventario con pregunta opcional '¿En qué
receta?'

*RF-05.4: Eliminar Item del Inventario*
- RF-05.4.1: Opción de eliminar desde detalle o swipe left con confirmación
- RF-05.4.2: Al eliminar, preguntar razón (ya lo usé/se venció/otro) y registrar desperdicio si aplica
- RF-05.5: Alertas de Vencimiento
- RF-05.5.1: El sistema debe verificar diariamente items próximos a vencer (1-2 días)
- RF-05.5.2: Enviar notificación local: 'nn [Item] vence en 2 días' con acción que abre inventario
- RF-05.5.3: Badge en tab Inventario muestra número de items urgentes (<3 días)

---

**RF-06: Dashboard Nutricional**

*RF-06.1: Vista Principal del Dashboard*
- RF-06.1.1: Dashboard en tab Perfil ® 'Nutrición de Hoy' muestra fecha, calorías consumidas/objetivo, barra
circular de progreso, porcentaje
- RF-06.1.2: El sistema calcula nutrición sumando calorías y macros de plan del día ajustados por porciones
- RF-06.1.3: Código de colores: n verde (90-110%), n amarillo (80-89% o 111-120%), n rojo (<80% o >120%)

*RF-06.2: Desglose de Macronutrientes*
- RF-06.2.1: Mostrar grid 3 columnas con proteínas/carbohidratos/grasas: consumidas/objetivo, barra de
progreso, porcentaje
- RF-06.2.2: Gráfico de dona con segmentos proporcionales de macros (proteínas azul, carbohidratos verde,
grasas naranja) con leyenda
- RF-06.2.3: Mostrar micronutrientes destacados opcionales: fibra, azúcares, sodio

*RF-06.3: Resumen Semanal*
- RF-06.3.1: Ver tendencias con gráfico de línea de calorías diarias (últimos 7 días) con línea de referencia de
objetivo
- RF-06.3.2: Mostrar promedio semanal de calorías y macros con comparación vs objetivo
- RF-06.3.3: Mostrar métrica de días que cumplió objetivo (5/7 días) con mensaje motivacional

---

**RF-07: Navegación y Estructura General**

*RF-07.1: Navegación Principal (Bottom Tabs)*
- RF-07.1.1: 5 tabs en bottom: nn Recetas, n Mi Semana, n Compras, n Inventario, n Perfil
- RF-07.1.2: Tab activo destacado con color primario, ícono filled y label bold
- RF-07.1.3: Badges en tabs cuando hay notificaciones (ej: Inventario muestra número de items vencidos)

*RF-07.2: Splash Screen y Onboarding*
- RF-07.2.1: Al abrir por primera vez, mostrar splash con logo, nombre y animación de carga
- RF-07.2.2: Si no autenticado, ir a pantalla de bienvenida con opciones Iniciar Sesión/Registrarse
- RF-07.2.3: Después de primer registro, mostrar tutorial de 3-4 pantallas explicando funcionalidades principales
- RF-07.2.4: Botón 'Omitir' en onboarding que guarda preferencia de no mostrar de nuevo

*RF-07.3: Estados Vacíos (Empty States)*
- RF-07.3.1: Mostrar estados vacíos con ícono ilustrativo, mensaje claro y CTA cuando no hay datos (ej: 'Aún no
tienes favoritos', 'Comienza agregando recetas')

*RF-07.4: Modo Offline Básico*
- RF-07.4.1: Datos ya cargados permanecen visibles sin internet (Firestore cache): recetas vistas, plan semanal,
lista de compras
- RF-07.4.2: Indicar al usuario cuando está offline con banner sutil 'Sin conexión. Algunos datos pueden estar
desactualizados'
- RF-07.4.3: Sincronización automática al reconectar con notificación 'Sincronizando...' ® 'Sincronizado 3'
---

**RF-08: Módulo de Gestión Financiera**

*RF-08.1: Configuración de Presupuesto*
- RF-08.1.1: El usuario debe poder configurar presupuesto mensual en COP (validación: >0 y <10,000,000)
- RF-08.1.2: El sistema debe calcular automáticamente equivalencias: semanal (mensual/4.33) y diario
(mensual/30)
- RF-08.1.3: Configurar alertas con checkboxes: al 75%, 90% y al exceder 100% del presupuesto

*RF-08.2: Precios en Recetas*
- RF-08.2.1: Cada ingrediente debe tener precio estimado en base de datos de ~100 ingredientes comunes en
COP
- RF-08.2.2: El sistema calcula precio total de receta sumando (cantidad × precio) de ingredientes
- RF-08.2.3: Mostrar en detalle de receta card de costo con total, por porción y tag
(económica/moderada/costosa)
- RF-08.2.4: Filtrar recetas por rango de precio: <$10,000, $10,000-$20,000, >$20,000

*RF-08.3: Lista de Compras con Precios*
- RF-08.3.1: Cada item de lista muestra precio estimado (formato: '2 Cebollas - $3,000')
- RF-08.3.2: Calcular y mostrar total estimado automáticamente en header ('Total estimado: $45,000')
- RF-08.3.3: Subtotales opcionales por categoría ('n Frutas y Verduras: $12,000')
- RF-08.3.4: Al completar compras, modal pregunta '¿Cuánto gastaste?' para registrar gasto real
- RF-08.3.5: Mostrar comparación con código de colores: 'Estimado: $45,000 | Real: $52,000 (+$7,000, +15%)'

*RF-08.4: Dashboard Financiero*
- RF-08.4.1: Dashboard en Perfil ® 'Presupuesto' muestra mes actual, gastado/presupuesto, barra de progreso,
días restantes, promedio diario
- RF-08.4.2: Métricas clave: gastado acumulado, quedan, promedio diario real, proyección fin de mes, gasto
diario recomendado
- RF-08.4.3: Gráfico de barras con gastos semanales (4 semanas) con colores diferenciados
- RF-08.4.4: Desglose opcional por categoría con donut chart (supermercado/delivery/snacks) mostrando
porcentajes y montos
- RF-08.4.5: Comparación con mes anterior: monto, diferencia absoluta y porcentual, indicador visual ­¯
- RF-08.4.6: Historial de transacciones cronológico con fecha, descripción, monto, categoría, filtros por
mes/categoría

*RF-08.5: Registro de Transacciones*
- RF-08.5.1: Registrar automáticamente gastos al completar lista de compras creando transacción en Firestore
- RF-08.5.2: Agregar transacciones manuales con formulario: monto (requerido), categoría, fecha (default: hoy),
notas
- RF-08.5.3: Editar transacciones existentes con tap ® modal edición, guardando cambios y recalculando
totales
- RF-08.5.4: Eliminar transacciones con swipe left, confirmación y recálculo automático de totales

*RF-08.6: Notificaciones Financieras*
- RF-08.6.1: Alerta al 75% del presupuesto: 'nn Llevas 75% de tu presupuesto. Has gastado $X de $Y. Te
quedan $Z'
- RF-08.6.2: Alerta al 90% del presupuesto más crítica: 'n Llevas 90% de tu presupuesto. Solo quedan $Z'
- RF-08.6.3: Alerta al exceder: 'n Excediste tu presupuesto. Has gastado $X de $Y. Excedente: $Z

---

## 4. REQUERIMIENTOS NO FUNCIONALES (RNF)
**RNF-01: Rendimiento**

*RNF-01.1: Tiempos de Respuesta*
- RNF-01.1.1: La app debe cargar pantalla principal en <2 segundos desde cold start en conexión 4G
- RNF-01.1.2: Búsqueda de recetas debe retornar resultados en <1 segundo para biblioteca de hasta 200
recetas
- RNF-01.1.3: Generación de lista de compras debe tomar <3 segundos con plan semanal completo (21
comidas)
- RNF-01.1.4: Transiciones entre pantallas deben mantener 60 FPS consistentes sin jank visible (<300ms)
- RNF-01.1.5: Scroll de listas debe ser fluido con FlatList optimizado, lazy loading y sin stuttering

*RNF-01.2: Uso de Memoria*
- RNF-01.2.1: La app no debe exceder 150MB de RAM en uso normal en dispositivos de gama media
- RNF-01.2.2: No debe haber memory leaks detectables usando herramientas de profiling
- RNF-01.3: Consumo de Batería
- RNF-01.3.1: La app no debe drenar batería excesivamente: <5% por hora de uso activo con minimal
background activity

*RNF-01.4: Uso de Datos*
- RNF-01.4.1: Minimizar consumo de datos con cache agresivo, compresión de imágenes y pagination
- RNF-01.4.2: Estimado: <50MB de datos móviles por mes de uso típico con 80 recetas cargadas
---
**RNF-02: USABILIDAD**

*RNF-02.1: Facilidad de Uso*
- RNF-02.1.1: Usuario nuevo debe completar onboarding en <90 segundos con 3-4 pantallas máximo y opción
de omitir
- RNF-02.1.2: Agregar primera receta al plan debe tomar <1 minuto con máximo 3 taps desde home
- RNF-02.1.3: Generar lista de compras debe tomar <30 segundos con 2 taps desde planificador sin
configuración
- RNF-02.1.4: Acciones principales no deben requerir más de 3 taps (principio de los 3 clics)
- RNF-02.1.5: Formularios deben tener validación en tiempo real con feedback inmediato y errores junto al
campo

*RNF-02.2: Curva de Aprendizaje*
- RNF-02.2.1: Usuario debe entender funcionalidad principal sin ayuda con UI autoexplicativa, labels claros e
íconos universales
- RNF-02.2.2: Tooltips o hints opcionales para features avanzados, dismissibles y no intrusivos

*RNF-02.3: Feedback Visual*
- RNF-02.3.1: Toda acción debe tener feedback inmediato: tap con ripple, guardar con loading ® 'Guardado 3',
error con mensaje claro, éxito con animación sutil
- RNF-02.3.2: Estados de carga deben ser informativos: 'Cargando recetas...', 'Generando lista...', no solo
spinners genéricos

*RNF-02.4: Mensajes de Error*
- RNF-02.4.1: Errores deben ser comprensibles para usuarios no técnicos traduciendo errores técnicos a
lenguaje amigable
- RNF-02.4.2: Errores deben sugerir solución cuando sea posible (ej: 'No hay conexión. Verifica tu WiFi'

---
**RNF-03: ACCESIBILIDAD**

*RNF-03.1: Contraste y Legibilidad*
- RNF-03.1.1: Textos deben tener contraste mínimo de 4.5:1 (WCAG AA) verificado con herramientas de
accesibilidad
- RNF-03.1.2: Tamaños de fuente legibles: texto normal mínimo 14sp, títulos mínimo 18sp, soportar escalado
del sistema hasta 200%
- RNF-03.1.3: No confiar solo en color para información: usar color + ícono + texto (ej: estado de presupuesto)

*RNF-03.2: Touch Targets*
- RNF-03.2.1: Botones y elementos tappeables deben tener mínimo 44x44 puntos (estándar iOS/Material
Design)
- RNF-03.2.2: Espaciado entre elementos tappeables mínimo 8 puntos para evitar taps accidentales

---
**RNF-04: COMPATIBILIDAD**

*RNF-04.1: Plataformas*
- RNF-04.1.1: Funcionar en iOS 13.0 o superior (iPhones desde iPhone 6S en adelante)
- RNF-04.1.2: Funcionar en Android 8.0 (API 26) o superior (cobertura de ~90% dispositivos Android activos)
- RNF-04.1.3: Ser responsive en pantallas de 4.7" a 6.7" (iPhone SE hasta iPhone Pro Max, dispositivos Android
pequeños hasta XL)
- RNF-04.1.4: Soporte opcional para tablets (iPad y tablets Android con layout adaptado)
---
**RNF-05: SEGURIDAD**

*RNF-05.1: Autenticación*
- RNF-05.1.1: Contraseñas hasheadas automáticamente por Firebase Auth, nunca en texto plano
- RNF-05.1.2: Comunicación con backend sobre HTTPS (Firebase usa HTTPS por defecto)
- RNF-05.1.3: Tokens de sesión con expiración de 1 hora y refresh automático
- RNF-05.1.4: Protección contra fuerza bruta con rate limiting built-in de Firebase Auth

*RNF-05.2: Protección de Datos*
- RNF-05.2.1: Datos de usuario privados con reglas de Firestore validando userId coincida (allow read, write: if
request.auth.uid == userId)
- RNF-05.2.2: Datos sensibles no logueados en producción (sin console.log de emails, contraseñas, datos
financieros)
- RNF-05.2.3: Almacenamiento local seguro con AsyncStorage para datos no críticos, nunca contraseñas
localmente

*RNF-05.3: Privacidad*
- RNF-05.3.1: No compartir datos de usuario con terceros, sin vender información, sin analytics invasivos
- RNF-05.3.2: Usuario puede eliminar cuenta y todos sus datos borrando documentos de Firestore con
confirmación de seguridad
- RNF-05.3.3: Cumplir con políticas de privacidad con documento accesible y términos aceptados al registrarse

---
**RNF-06: CONFIABILIDAD**

*RNF-06.1: Disponibilidad*
- RNF-06.1.1: Firebase tiene SLA de 99.95% garantizado por Google (fuera del control del equipo)
- RNF-06.1.2: La app no debe crashear durante uso normal con crash rate <1% usando manejo de excepciones
con try-catch

*RNF-06.2: Recuperación de Errores*
- RNF-06.2.1: Sin conexión, la app funciona parcialmente con Firestore cache permitiendo lectura offline,
escrituras encoladas que sincronizan al reconectar
- RNF-06.2.2: Si falla carga de imagen, mostrar placeholder genérico sin romper layout
- RNF-06.2.3: Si falla operación, permitir reintentar con botón 'Reintentar' en pantallas de error

---
**RNF-07: MANTENIBILIDAD**

*RNF-07.1: Calidad de Código*
- RNF-07.1.1: Código debe seguir guía de estilo consistente con ESLint + Prettier configurados y convenciones
de nombres claras
- RNF-07.1.2: Funciones no deben exceder 50 líneas (guideline) siguiendo principio de responsabilidad única
- RNF-07.1.3: Código debe tener comentarios en secciones complejas especialmente algoritmos, sin comentar
obviedades
- RNF-07.1.4: Nombres de variables y funciones deben ser descriptivos (ej: fetchRecipesFromFirestore, no
getData)

*RNF-07.2: Arquitectura*
- RNF-07.2.1: Separación clara de responsabilidades: Screens (UI), ViewModels/Redux (lógica), Services
(Firebase), Models (tipos)
- RNF-07.2.2: Componentes deben ser reutilizables (ej: RecipeCard usado en múltiples pantallas, CustomButton
con variantes)
- RNF-07.2.3: Lógica de negocio no debe estar en componentes UI, solo en services/utils, UI solo renderiza y
dispatch actions

*RNF-07.3: Documentación*
- RNF-07.3.1: README debe explicar cómo ejecutar el proyecto con pasos de instalación, configuración de
Firebase y comandos
- RNF-07.3.2: Funciones públicas deben tener JSDoc comments con descripción, parámetros y retorno
- RNF-07.3.3: Cada módulo debe tener README breve explicando propósito

*RNF-07.4: Testing*
- RNF-07.4.1: Funciones críticas deben tener unit tests: cálculos nutricionales, consolidación de lista, cálculos
financieros
- RNF-07.4.2: Cobertura de tests: >60% (goal) priorizando lógica de negocio sobre UI
---
**RNF-08: PORTABILIDAD**

*RNF-08.1: Código Compartido*
- RNF-08.1.1: 95%+ del código debe funcionar en iOS y Android con React Native permitiendo una sola
codebase
- RNF-08.1.2: Dependencias específicas de plataforma deben estar aisladas en wrappers con API común

---
**RNF-09: ESCALABILIDAD**

*RNF-09.1: Base de Datos*
- RNF-09.1.1: La app debe soportar hasta 500 recetas sin degradación con pagination adecuada, cache y lazy
loading
- RNF-09.1.2: Usuario debe poder tener hasta 500 transacciones financieras (1-2 años) con pagination en
historial
- RNF-09.1.3: Inventario debe soportar hasta 100 items por usuario sin lag en UI

*RNF-09.2: Firebase*
- RNF-09.2.1: Queries de Firestore optimizados con índices compuestos para queries complejos y limit() en
queries de listas
- RNF-09.2.2: Imágenes comprimidas antes de subir: máximo 800x600px, calidad 70-80%, tamaño objetivo
<200KB

---
**RNF-12: MÓDULO FINANCIERO ESPECÍFICO**

*RNF-12.1: Precisión de Cálculos*
- RNF-12.1.1: Cálculos financieros deben ser exactos sin errores de redondeo, validando que suma de partes =
total
- RNF-12.1.2: Precios estimados deben ser realistas basados en promedio de supermercados locales con
disclaimer visible
- RNF-12.1.3: Fechas de transacciones deben ser correctas usando timestamp de servidor Firestore

*RNF-12.2: Privacidad Financiera*
- RNF-12.2.1: Datos financieros son privados por usuario con reglas de Firestore validando userId
- RNF-12.2.2: No compartir datos financieros con terceros sin analytics de montos específicos

*RNF-12.3: Usabilidad Financiera*
- RNF-12.3.1: Configurar presupuesto debe tomar <30 segundos y registrar gasto real <15 segundos
- RNF-12.3.2: Precios en formato local Colombia: '$45.000' o '$45.000 COP' con separador de miles punto
- RNF-12.3.3: Colores intuitivos: verde (bajo presupuesto), amarillo (cerca límite), rojo (sobre presupuesto)

---

## 👨‍💻 Equipo

Proyecto desarrollado por un equipo de **4 desarrolladores**.
