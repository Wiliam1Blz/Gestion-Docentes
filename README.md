# CERTUS · Gestión Docente

**Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT) · Evidencia 1 · AA1 - Avance (semana 4)**

**Grupo:** Grupo X · **Integrantes:** [integrante 1], [integrante 2], [integrante 3], [integrante 4], [integrante 5]

Aplicación web responsiva para gestionar el **legajo docente**: datos personales, evaluaciones por semestre, encuestas, supervisión de clases,
capacitaciones, reportes descargables y **constancias verificables**.

> **Versión web del informe:** al ejecutar la aplicación, abre **<http://localhost:3000/informe.html>** (también está enlazada en la pantalla de ingreso).
> Esa página reúne todo lo que pide la rúbrica: problemática, solución, plan, cronograma, presupuesto, riesgos, diseño, implementación y viabilidad.
> Un resumen está en [`docs/PLAN-DEL-PROYECTO.md`](docs/PLAN-DEL-PROYECTO.md).

## Cumplimiento de la rúbrica

| Criterio de la rúbrica | Dónde se cumple |
|---|---|
| Identificación de la necesidad o problemática | Sección 1 de este README y de `/informe.html` |
| Propuesta de solución | Sección 1.2 y sección 2 de `/informe.html` (alternativas y justificación) |
| Planificación del proyecto (resumen ejecutivo, objetivos, alcance, cronograma, presupuesto, riesgos) | Secciones 1.3 a 1.7 de este README; sección 3 de `/informe.html` |
| Desarrollo del proyecto (prototipo) | La aplicación en funcionamiento y la sección 2 de este README |
| Viabilidad y sostenibilidad | Sección 3 de este README; sección 6 de `/informe.html` |

---

# AA1 - Avance

## 1. Identificación de la posible solución a desarrollar

### 1.1 Problemática

La información docente está repartida en archivos y hojas de cálculo sin permisos ni auditoría. Esto produce:

- **Datos dispersos:** no hay una vista única de cada docente.
- **Seguimiento manual de capacitaciones:** es difícil saber quién cumplió las obligatorias.
- **Constancias difíciles de verificar:** hay riesgo de falsificación o pérdida.
- **Reportes lentos:** se arman a mano, con errores, para acreditación.
- **Información sensible sin control:** los datos personales (protegidos por la Ley 29733) se comparten sin registro de quién los ve o cambia.

### 1.2 Solución propuesta y justificación

Una plataforma web propia que reúne todo el ciclo del docente en una base de datos y da acceso según el rol.

| Alternativa | Decisión | Motivo |
|---|---|---|
| Seguir con hojas de cálculo | Descartada | Sin permisos, auditoría ni verificación; los datos siguen dispersos |
| Comprar un sistema comercial de RR. HH. | Descartada | Costo de licencia y no se adapta a reglas propias (80 % de asistencia, nota 13, constancias verificables) |
| **Desarrollar una plataforma propia y ligera** | **Elegida** | Se ajusta a la institución, cuesta poco y el equipo controla el código |

Qué la diferencia: constancias verificables por cualquiera, reglas de aprobación calculadas por el sistema, una sola dependencia externa (`mysql2`) y privacidad desde el diseño.

### 1.3 Resumen ejecutivo

CERTUS · Gestión Docente centraliza legajo, evaluaciones, supervisiones y capacitaciones, y emite constancias verificables en línea.
A la semana 4 el prototipo cubre los siete módulos del alcance. El proyecto dura 8 semanas y cuesta S/ 2,350 en total (S/ 150 en efectivo).

### 1.4 Objetivos

**General:** implementar en 8 semanas una plataforma web que centralice la gestión docente con acceso según el rol de cada usuario.

**Específicos:**

1. Documentar la problemática y los requisitos al terminar la semana 2.
2. Diseñar el modelo de datos (8 tablas) y los 3 roles al terminar la semana 3.
3. Entregar en la semana 4 un prototipo funcional de los siete módulos.
4. Validar con usuarios reales en las semanas 5 y 6 y corregir en las semanas 6 y 7.
5. Publicar en la nube y entregar manual y código documentado en la semana 8.

### 1.5 Plan de trabajo: cronograma e hitos

Se supone que la semana 1 inicia el lunes 2 de noviembre de 2026 (ajustar al calendario real).

| Hito | Semana | Fecha límite | Entregable | Depende de |
|---|---|---|---|---|
| H1 | 1 | 8 nov 2026 | Problemática presentada y requisitos entendidos | — |
| H2 | 2 | 15 nov 2026 | Solución elegida y plan de trabajo con fechas | H1 |
| H3 | 3 | 22 nov 2026 | Diseño: estructura, alcance, modelo de datos y plan de implementación | H2 |
| H4 | 4 | 29 nov 2026 | Prototipo funcional, informe y exposición (Entregable 1) | H3 |
| H5 | 8 | 27 dic 2026 | Aplicación validada, publicada y documentada | H4 |

| Actividad | Semanas | Estado |
|---|---|---|
| Problema y requisitos | 1 | Hecho |
| Análisis y solución; plan de trabajo | 2 | Hecho |
| Diseño y modelo de datos; plan de implementación | 3 | Hecho |
| Prototipo funcional | 3 a 4 | Hecho |
| Informe y exposición | 4 | Hecho |
| Pruebas con usuarios | 5 a 6 | Por hacer |
| Mejoras y seguridad | 6 a 7 | Por hacer |
| Despliegue en la nube | 7 a 8 | Por hacer |
| Manual y cierre | 8 | Por hacer |

El cronograma dibujado como diagrama de Gantt está en `/informe.html#cronograma`.

### 1.6 Presupuesto

| Concepto | Costo (S/) |
|---|---|
| Horas del equipo: 5 integrantes × 8 semanas × 5 h = 200 h a S/ 10 (valorizadas, no es desembolso) | 2,000 |
| Hosting (Render, plan gratuito) y base de datos (TiDB Cloud, plan gratuito) | 0 |
| Dominio propio (opcional) | 60 |
| Internet y movilidad para pruebas con usuarios | 50 |
| Impresiones y materiales | 40 |
| Contingencia | 200 |
| **Total** (efectivo: S/ 150) | **2,350** |

### 1.7 Análisis de riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Caída o límites del plan gratuito de la nube | Media | Alto | `schema.sql` y `npm run reset` permiten recrear la base en otro proveedor |
| Filtración o pérdida de datos personales | Baja | Alto | Hash scrypt, sesiones firmadas de 8 h, bloqueo tras 5 intentos, auditoría y datos ficticios en demos |
| Retraso por la carga académica | Media | Medio | Hitos semanales, módulos repartidos y margen en la semana 7 |
| Baja adopción por los docentes | Media | Alto | Registro simple, diseño responsivo y guía corta |
| Datos reales con formato distinto | Media | Medio | Probar con una muestra real antes del despliegue |
| Una sola persona conoce el código | Media | Medio | README completo, código comentado y revisión entre pares |

## 2. Diseño y desarrollo del proyecto

### 2.1 Estructura y alcance

| Incluye | No incluye (en esta etapa) |
|---|---|
| Legajo docente | Integración con el sistema académico o contable |
| Evaluaciones, encuestas y supervisión de clases | Aplicación móvil nativa |
| Capacitaciones con cupos, inscripción, asistencia y nota | Correos y notificaciones automáticas |
| Constancias en PDF con verificación pública | Firma digital con validez legal |
| Reportes en Excel, CSV y PDF | Carga masiva de datos |
| Roles, control de acceso y auditoría | Análisis automático de comentarios |

```
server.js            Servidor, rutas de acceso y router con permisos por rol
lib/                 Base de datos, reglas, consultas, reportes y rutas por módulo
public/              Interfaz web: index.html (aplicación), verificar.html e informe.html
database/schema.sql  Las 8 tablas del sistema
scripts/reset.js     Borra las tablas para empezar de cero
docs/                Resumen del plan del proyecto
render.yaml          Configuración de despliegue en Render
```

| Capa | Tecnología |
|---|---|
| Presentación | HTML, CSS y JavaScript sin frameworks (`public/`) |
| Lógica | Node.js ≥ 22.5, router propio (`server.js`, `lib/`) |
| Datos | MySQL con `mysql2`; Excel, PDF y ZIP generados con código propio |

### 2.2 Prototipo

Estado de los módulos (todos implementados):

| Módulo | Qué permite |
|---|---|
| Acceso y seguridad | Ingreso, registro de docentes, cambio de clave, bloqueo tras 5 intentos fallidos |
| Legajo docente | Alta, edición, búsqueda con filtros y ficha en PDF |
| Evaluaciones, encuestas y supervisiones | Registro y consulta por docente y semestre |
| Capacitaciones | Programación, cupos, inscripción, asistencia y nota; aprueba con **asistencia ≥ 80 %** y **nota ≥ 13** |
| Constancias | PDF con código único, emisión masiva, ZIP por docente y verificación pública en `/verificar.html` |
| Reportes y monitoreo | Excel, CSV y PDF; tablero de cumplimiento |
| Auditoría | Últimos 200 movimientos (solo administrador) |

**Roles y permisos**

| Acción | Administrador | Supervisor | Docente |
|---|:-:|:-:|:-:|
| Ver lista de docentes y monitoreo | ✔ | ✔ | |
| Crear, editar o eliminar docentes | ✔ | | |
| Registrar evaluaciones y supervisiones | ✔ | ✔ | |
| Registrar encuestas | ✔ | | |
| Gestionar capacitaciones, inscripciones y constancias | ✔ | | |
| Inscribirse por su cuenta a una capacitación | | | ✔ |
| Ver legajos, fichas y constancias | todos | todos | solo el suyo |
| Descargar reportes Excel y CSV | ✔ | ✔ | |
| Ver auditoría | ✔ | | |

**Modelo de datos (8 tablas):** `docentes`, `usuarios`, `evaluaciones`, `encuestas`, `supervisiones`, `capacitaciones`, `inscripciones` (relaciona docentes con capacitaciones y guarda asistencia, nota y código de constancia) y `auditoria`.

**Seguridad:** contraseñas con hash `scrypt`; sesiones firmadas con HMAC; bloqueo temporal tras 5 intentos fallidos; límite de registros por IP; un docente solo ve su propia información; cabeceras de seguridad (CSP, `X-Frame-Options`, `nosniff`); registro de auditoría.

### 2.3 Plan de implementación

| Paso | Semanas | Qué se hace | Criterio de aceptación |
|---|---|---|---|
| 1. Preparar el entorno | 5 | Instalar Node.js y MySQL, configurar `.env`, `npm install` y `npm start` | La aplicación abre en todas las computadoras del equipo |
| 2. Validar con usuarios | 5 y 6 | Pruebas guiadas con 1 administrador, 2 supervisores y 5 docentes | Los 8 usuarios completan sus tareas principales |
| 3. Corregir y reforzar | 6 y 7 | Resolver observaciones, revisar permisos, cambiar claves de demostración y fijar `SECRETO_SESION` | Cero errores críticos abiertos |
| 4. Publicar en la nube | 7 y 8 | Base en TiDB Cloud y despliegue en Render con `render.yaml` | La aplicación responde por HTTPS |
| 5. Capacitar y cerrar | 8 | Manual de usuario, demostración de 30 minutos, entrega de código y copia de la base | La institución recibe manual, código y respaldo |

| Rol en el equipo | Integrante | Responsabilidad |
|---|---|---|
| Líder y gestión | [Integrante 1] | Cronograma, coordinación y riesgos |
| Desarrollo de servidor | [Integrante 2] | Reglas de negocio, permisos, reportes y constancias |
| Desarrollo de interfaz | [Integrante 3] | Pantallas, usabilidad y diseño responsivo |
| Base de datos y pruebas | [Integrante 4] | Esquema, datos de prueba y casos de prueba |
| Documentación y despliegue | [Integrante 5] | Manual, informe y publicación |

## 3. Viabilidad y sostenibilidad

| Dimensión | Evaluación | Sustento |
|---|---|---|
| Técnica | Alta | Tecnologías comunes y una sola dependencia externa |
| Económica | Alta | S/ 150 en efectivo; planes gratuitos durante la validación |
| Operativa | Media a alta | Solo se necesita un navegador; depende de que la institución mantenga los datos |
| Legal | Media | Datos personales (Ley 29733): aviso de privacidad, consentimiento y acceso por rol |

**Corto plazo (hasta 6 meses):** mantener el plan gratuito y medir el uso real; copia semanal de la base con prueba de restauración; corregir errores en la semana siguiente.

**Largo plazo:** migrar a un plan de pago o servidor propio si el gratuito se queda corto; escalar la base y el servidor por separado (índices y paginación); modificar las reglas de aprobación en un solo lugar (`REGLAS` en `lib/db.js`); entregar manual y designar un responsable en TI; revisar permisos y actualizar Node.js y `mysql2` cada semestre.

**Mejoras futuras:** integración con el sistema académico, correos automáticos, carga masiva de datos y firma digital de constancias.

---

## Cómo ejecutarlo

1. Instala **Node.js 22.5 o superior** y **MySQL** (o usa una base en la nube, por ejemplo TiDB Cloud).
2. Copia `.env.example` a `.env` y completa `DB_HOST`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`.
3. Ejecuta:

   ```bash
   npm install
   npm start
   ```

4. Abre <http://localhost:3000>. La primera vez se crean las tablas y se llenan con **datos ficticios de demostración**.

**Cuentas de demostración** (clave `Certus2026!`, cambiable con `CLAVE_DEMO`): administrador `gestion.docente@certus.edu.pe`, supervisor `supervision@certus.edu.pe`.
La pantalla de ingreso también tiene botones de acceso rápido para cada rol.

| Variable | Para qué sirve | Por defecto |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL | `localhost`, `3306`, `root`, vacío, `certus_docente` |
| `DB_SSL` | `true` si la base en la nube exige cifrado | desactivado |
| `DB_SKIP_CREATE` | `true` si la base ya existe y no se puede crear | desactivado |
| `PORT` | Puerto del servidor | `3000` |
| `DOMINIO_INSTITUCIONAL` | Dominio de correo aceptado | `certus.edu.pe` |
| `CLAVE_DEMO` | Clave de las cuentas de demostración | `Certus2026!` |
| `SECRETO_SESION` | Clave para firmar sesiones (obligatoria al publicar) | se genera en `data/secret.key` |

Comandos: `npm start` inicia el servidor; `npm run reset` borra las tablas y se recrean al volver a iniciar.

**Publicar en Render + TiDB Cloud:** crea la base en TiDB Cloud, crea un servicio web en Render desde este repositorio (`render.yaml` ya define el inicio y las variables), completa `DB_HOST`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`, deja `DB_SSL=true` y `DB_SKIP_CREATE=true`, y cambia las claves de demostración antes de usar datos reales.

Usa solo datos ficticios en pruebas y demostraciones.

## Licencia

MIT
