# 🍽️ MealPrep Pro  
## Tu Chef Personal Inteligente

---

## 1. INTRODUCCIÓN

MealPrep Pro es una aplicación móvil multiplataforma diseñada para simplificar la planificación de comidas, la gestión de compras y el control nutricional y financiero para personas ocupadas, especialmente estudiantes universitarios y jóvenes profesionales.

Este documento define todos los **requerimientos funcionales y no funcionales** del sistema, estableciendo las bases para el desarrollo del proyecto durante un período de **3 meses** con un equipo de **4 desarrolladores**.

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

## 2. RESUMEN EJECUTIVO

**Nombre del Proyecto:** MealPrep Pro – Tu Chef Personal Inteligente  

**Descripción:**  
Aplicación móvil que permite a usuarios planificar comidas semanales, generar listas de compras automáticas, acceder a recetas saludables con información nutricional, gestionar inventario de alimentos y controlar gastos en comida.

### Stack Tecnológico

- **Frontend:** React Native 0.73+ con TypeScript  
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

### RF-01: Autenticación y Perfil de Usuario
- Registro de usuario con email y contraseña  
- Inicio de sesión persistente  
- Recuperación de contraseña  
- Configuración de perfil nutricional  
- Cálculo automático de TDEE y macronutrientes  
- Gestión de alergias e intolerancias  

---

### RF-02: Gestión de Recetas
- Biblioteca de recetas con vista lista/grid  
- Búsqueda en tiempo real  
- Filtros avanzados por tipo, tiempo, dieta, calorías y precio  
- Vista detallada de recetas con información nutricional y costos  
- Sistema de recetas favoritas  

---

### RF-03: Planificador Semanal
- Calendario semanal por comidas  
- Resumen nutricional diario y semanal  
- Ajuste dinámico de porciones  
- Generación automática de lista de compras  

---

### RF-04: Lista de Compras
- Lista agrupada por secciones del supermercado  
- Edición manual de ítems  
- Cálculo automático de costos  
- Registro de gasto real  

---

### RF-05: Gestión de Inventario
- Control de inventario por ubicación  
- Alertas de vencimiento  
- Registro de consumo y desperdicio  

---

### RF-06: Dashboard Nutricional
- Seguimiento diario de calorías y macronutrientes  
- Gráficos e indicadores visuales  
- Resumen semanal  

---

### RF-07: Navegación y Estructura General
- Navegación principal con Bottom Tabs  
- Onboarding inicial  
- Estados vacíos informativos  
- Soporte básico offline  

---

### RF-08: Módulo de Gestión Financiera
- Presupuesto mensual configurable  
- Control de gastos  
- Dashboard financiero  
- Alertas de presupuesto  
- Historial de transacciones  

---

## 4. REQUERIMIENTOS NO FUNCIONALES (RNF)

### RNF-01: Rendimiento
- Carga inicial < 2 segundos  
- Búsquedas < 1 segundo  
- Animaciones fluidas (60 FPS)  

---

### RNF-02: Usabilidad
- Principio de los 3 clics  
- Formularios con validación en tiempo real  
- Feedback inmediato al usuario  

---

### RNF-03: Accesibilidad
- Cumplimiento WCAG AA  
- Tamaños de fuente escalables  
- Touch targets mínimos de 44x44 px  

---

### RNF-04: Compatibilidad
- iOS 13+  
- Android 8.0+  
- Soporte para múltiples tamaños de pantalla  

---

### RNF-05: Seguridad
- Autenticación segura con Firebase  
- Protección de datos del usuario  
- Comunicación HTTPS  

---

### RNF-06: Confiabilidad
- Alta disponibilidad  
- Manejo de errores  
- Funcionamiento parcial sin conexión  

---

### RNF-07: Mantenibilidad
- Arquitectura modular  
- Código documentado  
- Testing de lógica crítica  

---

### RNF-08: Escalabilidad
- Soporte para crecimiento de datos  
- Optimización de consultas  
- Manejo eficiente de recursos  

---

## 👨‍💻 Equipo

Proyecto desarrollado por un equipo de **4 desarrolladores**.
