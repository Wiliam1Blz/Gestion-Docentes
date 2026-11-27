# CERTUS · Gestión Docente

Aplicación web responsiva para gestionar el **legajo docente**: datos personales, evaluaciones por semestre, encuestas, supervisión de clases,
capacitaciones, reportes descargables y **constancias verificables**.

**General:* implementar una plataforma web que centralice la gestión docente con acceso según el rol de cada usuario.


 Estructura 

| Incluye | No incluye (en esta etapa) |
|---|---|
| Legajo docente | Integración con el sistema académico o contable |
| Evaluaciones, encuestas y supervisión de clases | Aplicación móvil nativa |
| Capacitaciones con cupos, inscripción, asistencia y nota | Correos y notificaciones automáticas |
| Constancias en PDF con verificación pública | Firma digital con validez legal |
| Reportes en Excel, CSV y PDF | Carga masiva de datos |
| Roles, control de acceso y auditoría | 
```


| Capa | Tecnología |
|---|---|
| Presentación | HTML, CSS y JavaScript sin frameworks 
| Datos | MySQL ; Excel, PDF y ZIP generados con código propio |

#Prototipo

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

| **Roles y permisos**

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

