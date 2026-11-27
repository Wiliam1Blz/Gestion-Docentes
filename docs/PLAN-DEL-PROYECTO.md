# Plan del proyecto · CERTUS Gestión Docente

Resumen del informe de la Evidencia 1 (EFSRT). La versión completa, con el cronograma dibujado, está en la página `/informe.html` de la aplicación.

## 1. Problemática
La información docente está dispersa en archivos y hojas de cálculo: no hay vista única del docente, el seguimiento de capacitaciones es manual, las constancias son difíciles de verificar, los reportes son lentos y los datos personales no tienen control de acceso ni registro.

## 2. Solución
Plataforma web propia con legajo único, roles (administrador, supervisor y docente), capacitaciones con reglas de aprobación, constancias con código verificable, reportes en Excel/CSV/PDF y auditoría. Se eligió frente a seguir con hojas de cálculo o comprar un sistema comercial porque cumple las reglas de la institución, controla el acceso y cuesta poco.

## 3. Objetivos
1. Documentar problemática y requisitos (semana 2).
2. Diseñar modelo de datos de 8 tablas y 3 roles (semana 3).
3. Entregar prototipo funcional (semana 4).
4. Validar con usuarios y corregir (semanas 5 a 7).
5. Publicar en la nube y entregar manual (semana 8).

## 4. Alcance
Incluye legajo, evaluaciones, encuestas, supervisiones, capacitaciones, constancias, reportes, roles y auditoría.
No incluye integración con otros sistemas, app móvil nativa, correos automáticos, carga masiva ni firma digital.

## 5. Cronograma e hitos
Suponiendo que la semana 1 inicia el 2 de noviembre de 2026 (ajustar al calendario real).

| Hito | Semana | Fecha límite | Entregable |
|---|---|---|---|
| H1 | 1 | 8 nov 2026 | Problemática presentada |
| H2 | 2 | 15 nov 2026 | Solución elegida y plan de trabajo |
| H3 | 3 | 22 nov 2026 | Diseño, alcance, modelo de datos y plan de implementación |
| H4 | 4 | 29 nov 2026 | Prototipo, informe y exposición (Entregable 1) |
| H5 | 8 | 27 dic 2026 | Aplicación validada, publicada y documentada |

## 6. Presupuesto
| Concepto | Costo (S/) |
|---|---|
| Horas del equipo (200 h × S/ 10, valorizadas) | 2,000 |
| Hosting (Render gratuito) y base de datos (TiDB Cloud gratuita) | 0 |
| Dominio propio opcional | 60 |
| Internet y movilidad | 50 |
| Impresiones y materiales | 40 |
| Contingencia | 200 |
| **Total** (efectivo: S/ 150) | **2,350** |

## 7. Riesgos principales
| Riesgo | Mitigación |
|---|---|
| Límites del plan gratuito de la nube | `schema.sql` y `npm run reset` permiten recrear la base en otro proveedor |
| Filtración de datos personales | Hash scrypt, sesiones firmadas, bloqueo por intentos, auditoría, datos ficticios en demos |
| Retraso del equipo | Hitos semanales y margen en la semana 7 |
| Baja adopción | Registro simple, diseño responsivo, guía corta |
| Dependencia de una persona | README completo y código comentado |

## 8. Plan de implementación
1. Preparar entorno (semana 5). 2. Validar con 8 usuarios (semanas 5 y 6). 3. Corregir y reforzar seguridad (semanas 6 y 7). 4. Publicar en Render y TiDB Cloud (semanas 7 y 8). 5. Manual, demostración y cierre (semana 8).

## 9. Viabilidad y sostenibilidad
Viable en lo técnico (tecnologías comunes, una sola dependencia), lo económico (S/ 150 en efectivo) y lo operativo (solo navegador). Para sostenerlo: copias semanales de la base, responsable de mantenimiento en TI, revisión de permisos cada semestre y migración a un plan de pago o servidor propio si el plan gratuito se queda corto.
