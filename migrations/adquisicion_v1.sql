-- ============================================================
-- MIGRACIÓN: Motor de Adquisición Geo-Targeted + Pitch Auditor
-- Proyecto: CRM Objetivo V2
-- Fecha: 2026-08-04
-- INSTRUCCIONES: Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. GUIONES DE VENTA (primero, FK de campaigns) ───

CREATE TABLE IF NOT EXISTS sales_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_guion TEXT NOT NULL,
  contexto_campana TEXT,
  activo BOOLEAN DEFAULT TRUE,
  pasos JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. CAMPAÑAS DE ADQUISICIÓN ───

CREATE TABLE IF NOT EXISTS acquisition_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fuente_tipo TEXT NOT NULL DEFAULT 'scraper_google'
    CHECK (fuente_tipo IN ('scraper_google','discovery_mintur','csv_manual','referido')),
  ciudad TEXT,
  canton TEXT,
  categoria_busqueda TEXT,
  script_id UUID REFERENCES sales_scripts(id) ON DELETE SET NULL,
  total_prospectos INT DEFAULT 0,
  total_llamadas INT DEFAULT 0,
  total_convertidos INT DEFAULT 0,
  estado TEXT DEFAULT 'activa'
    CHECK (estado IN ('activa','pausada','cerrada')),
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. EXTENSIÓN contacts (4 columnas, no-destructivo) ───

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES acquisition_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS telefono_e164 TEXT,
  ADD COLUMN IF NOT EXISTS telefono_tipo TEXT
    CHECK (telefono_tipo IN ('celular','fijo','invalido')),
  ADD COLUMN IF NOT EXISTS es_target_real BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tel_e164 ON contacts(telefono_e164);

-- ─── 4. EXTENSIÓN call_analyses (4 columnas, no-destructivo) ───

ALTER TABLE call_analyses
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES acquisition_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES sales_scripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audio_blob_key TEXT,
  ADD COLUMN IF NOT EXISTS audio_expires_at TIMESTAMPTZ;

-- ─── 5. SEED: Guion ActivaQR ───

INSERT INTO sales_scripts (nombre_guion, contexto_campana, activo, pasos) VALUES (
  'Guion ActivaQR — Imprentas y Señalización',
  'Para negocios de impresión, señalética, rotulación y gran formato. Producto ActivaQR.',
  TRUE,
  '[
    {"orden":1,"gatillo":"Identidad","objetivo":"Confirmar rol del interlocutor","keywords":"confirmar,rol,respeto,tiempo","frase":"Buenas, ¿hablo con [NOMBRE]?\n[NOMBRE], un gusto, le saluda César Reyes, de la empresa Objetivo.\n¿Podemos hablar un par de minutos?"},
    {"orden":2,"gatillo":"Problema","objetivo":"Despertar dolor latente","keywords":"problema,clientes,contacto,local","frase":"Muchos negocios como el suyo tienen el problema de que sus clientes no los pueden encontrar fácilmente o no saben cómo contactarlos cuando salen del local..."},
    {"orden":3,"gatillo":"Ganancia temprana","objetivo":"Gancho de ganancia rápido antes de objeciones","keywords":"QR,resultado,precio,bajo","frase":"Lo que hacemos es crear un QR que conecta el mundo físico con el digital. 1 de cada 3 negocios que lo prueba lo activa. Empieza desde $7..."},
    {"orden":4,"gatillo":"Delegación","objetivo":"Reducir fricción de tiempo","keywords":"rápido,fácil,formulario,4 minutos","frase":"Solo necesito 4 minutos de su tiempo para llenar un formulario y ya queda activo..."},
    {"orden":5,"gatillo":"Demo en vivo","objetivo":"Demostración práctica con cliente real","keywords":"demostrar,escanear,cliente,ahora","frase":"¿Me permite que su propio cliente escanee el QR de SU negocio en este momento?"},
    {"orden":6,"gatillo":"Activación","objetivo":"Mostrar facilidad operativa","keywords":"rápido,activar,clientes,minutos","frase":"La activación completa toma 2-3 minutos por cliente..."},
    {"orden":7,"gatillo":"Cierre","objetivo":"Obtener compromiso directo","keywords":"equipo,decidir,empezar,hoy","frase":"¿Quién de su equipo se encargaría de esto? ¿Empezamos hoy?"}
  ]'::jsonb
);

-- ─── VERIFICACIÓN ───
-- SELECT * FROM sales_scripts;
-- SELECT * FROM acquisition_campaigns;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'contacts' AND column_name IN ('campaign_id','telefono_e164','telefono_tipo','es_target_real');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'call_analyses' AND column_name IN ('campaign_id','script_id','audio_blob_key','audio_expires_at');
