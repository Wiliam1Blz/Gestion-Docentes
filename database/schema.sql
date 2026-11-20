-- CERTUS · Gestión Docente — esquema MySQL 8 (InnoDB, utf8mb4)
-- El servidor ejecuta este archivo solo al iniciar (CREATE ... IF NOT EXISTS), pero también
-- puedes correrlo a mano en MySQL Workbench o phpMyAdmin. Cada sentencia termina en punto y coma.

CREATE TABLE IF NOT EXISTS docentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  dni CHAR(8) NOT NULL UNIQUE,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  telefono VARCHAR(20),
  direccion VARCHAR(200),
  fecha_nacimiento DATE,
  sede VARCHAR(60) NOT NULL,
  programa VARCHAR(120) NOT NULL,
  categoria VARCHAR(30) NOT NULL DEFAULT 'Tiempo parcial',
  grado_academico VARCHAR(60),
  especialidad VARCHAR(120),
  fecha_ingreso DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  observaciones TEXT,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  nombre VARCHAR(170) NOT NULL,
  rol ENUM('admin','supervisor','docente') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  docente_id INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_usr_doc FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docente_id INT NOT NULL,
  periodo VARCHAR(10) NOT NULL,
  puntaje DOUBLE NOT NULL,
  evaluador VARCHAR(170),
  comentario TEXT,
  UNIQUE KEY uq_eval (docente_id, periodo),
  CONSTRAINT fk_eval_doc FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS encuestas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docente_id INT NOT NULL,
  periodo VARCHAR(10) NOT NULL,
  curso VARCHAR(120) NOT NULL,
  respuestas INT NOT NULL DEFAULT 0,
  puntaje DOUBLE NOT NULL,
  comentario TEXT,
  CONSTRAINT fk_enc_doc FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supervisiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docente_id INT NOT NULL,
  fecha DATE NOT NULL,
  curso VARCHAR(120) NOT NULL,
  supervisor VARCHAR(170) NOT NULL,
  puntaje DOUBLE NOT NULL,
  fortalezas TEXT,
  oportunidades TEXT,
  compromisos TEXT,
  CONSTRAINT fk_sup_doc FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS capacitaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT,
  modalidad VARCHAR(20) NOT NULL DEFAULT 'Virtual',
  horas INT NOT NULL DEFAULT 4,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  instructor VARCHAR(100),
  cupo INT NOT NULL DEFAULT 30,
  obligatoria TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM('programada','en_curso','finalizada','cancelada') NOT NULL DEFAULT 'programada'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inscripciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  capacitacion_id INT NOT NULL,
  docente_id INT NOT NULL,
  estado ENUM('inscrito','aprobado','desaprobado','retirado') NOT NULL DEFAULT 'inscrito',
  asistencia DOUBLE NULL,
  nota DOUBLE NULL,
  fecha_inscripcion DATE DEFAULT (CURRENT_DATE),
  constancia_codigo VARCHAR(60) NULL UNIQUE,
  constancia_fecha DATE NULL,
  UNIQUE KEY uq_insc (capacitacion_id, docente_id),
  CONSTRAINT fk_insc_cap FOREIGN KEY (capacitacion_id) REFERENCES capacitaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_insc_doc FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario VARCHAR(120),
  accion VARCHAR(60),
  detalle TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
