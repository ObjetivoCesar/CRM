-- Full Schema for Discovery Leads based on CSV
-- "Ejemplo de base de datos sector turismo - Hoja 1.csv"

DROP TABLE IF EXISTS discovery_leads CASCADE;

CREATE TABLE discovery_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación y Estado
    ruc TEXT,
    codigo_establecimiento_ruc TEXT, -- Código de Establecimiento RUC
    estado_ruc TEXT, -- Estado RUC
    nombre_comercial TEXT NOT NULL, -- Nombre Comercial
    numero_registro TEXT, -- Número de Registro
    fecha_registro TEXT, -- Fecha de Registro
    
    -- Clasificación
    actividad_modalidad TEXT, -- Actividad / Modalidad
    clasificacion TEXT, -- Clasificación
    categoria TEXT, -- Categoría
    
    -- Propietario / Legal
    razon_social_propietario TEXT, -- Razón social (Propietario)
    representante_legal TEXT, -- Representante Legal
    tipo_personeria_juridica TEXT, -- Tipo de Personería Jurídica
    personeria_juridica TEXT, -- Personería Jurídica
    
    -- Localización
    provincia TEXT, -- Provincia
    canton TEXT, -- Cantón
    parroquia TEXT, -- Parroquia
    tipo_parroquia TEXT, -- Tipo de Parroquia
    direccion TEXT, -- Dirección
    referencia_direccion TEXT, -- Referencia de Dirección
    latitud TEXT, -- Latitud
    longitud TEXT, -- Longitud
    zona_turistica TEXT, -- ZonaTuristica
    administracion_zonal TEXT, -- AdministracionZonal
    sector_turistico TEXT, -- SectorTuristico

    -- Contacto
    telefono_principal TEXT, -- Teléfono Principal
    telefono_secundario TEXT, -- Teléfono Secundario
    correo_electronico TEXT, -- Correo Electrónico
    direccion_web TEXT, -- Dirección Web
    persona_contacto TEXT, -- Persona de Contacto
    correo_persona_contacto TEXT, -- Correo Electrónico Persona de Contacto

    -- Detalles Operativos
    tipo_local TEXT, -- Tipo de Local
    tipo_establecimiento TEXT, -- Tipo Establecimiento
    nombre_franquicia_cadena TEXT, -- Nombre (Franquicia o Cadena)
    estado_registro_establecimiento TEXT, -- Estado Registro del Establecimiento
    sistema_origen TEXT, -- Sistema Origen
    estado_registro_con_deuda TEXT, -- Estado del Registro Con Deuda
    
    -- Personal
    total_trabajadores_hombres INTEGER, -- Total de Trabajadores Hombres
    total_trabajadores_mujeres INTEGER, -- Total de Trabajadores Mujeres
    total_trabajadores_hombres_discapacidad INTEGER, -- Total de Trabajadores Hombres Con Discapacidad
    total_trabajadores_mujeres_discapacidad INTEGER, -- Total de Trabajadores Mujeres Con Discapacidad
    total_trabajadores INTEGER, -- Total Trabajadores

    -- Capacidades (Alojamiento/Restaurante)
    total_habitaciones_tiendas INTEGER, -- Total Habitaciones / tiendas de campaña
    total_camas INTEGER, -- Total Camas
    total_plazas INTEGER, -- Total Plazas
    total_capacidades_servicios_complementarios INTEGER, -- Total Capacidades Servicios Complementarios
    total_mesas INTEGER, -- Total de mesas
    total_capacidades_personas INTEGER, -- Total capacidades en número de personas
    
    -- Títulos y Vehículos
    titulo_habilitante TEXT, -- Título habilitante
    fecha_emision_titulo TEXT, -- Fecha de emisión del Título habilitante
    fecha_caducidad_titulo TEXT, -- Fecha de caducidad del Título habilitante
    tipo_vehiculo TEXT,
    matricula TEXT,
    fecha_matricula TEXT,
    fecha_caducidad_matricula TEXT,
    capacidad_unidad INTEGER,
    total_vehiculos INTEGER,
    total_asientos_vehiculos INTEGER,
    tipo_local_transporte TEXT,
    tipo_embarcaciones TEXT,
    modalidad_embarcaciones TEXT,
    matricula_embarcacion TEXT,
    total_capacidades_embarcaciones INTEGER,
    total_capacidades_otras_actividades INTEGER,

    -- Tarifas y Servicios
    anio_declaracion_tarifario TEXT,
    fecha_declaracion_tarifario TEXT,
    tipos_capacidades TEXT,
    cantidad_por_tipo_capacidad TEXT,
    plazas_por_tipo_capacidad TEXT,
    tarifa_por_tipo_capacidad TEXT,
    tipos_cocina TEXT,
    tipos_servicio TEXT,
    modalidades_turismo_aventura TEXT,
    actividades_permitidas_ctc TEXT,

    -- Guías y Transporte
    identificaciones_guias_turismo TEXT,
    nombres_guias_turismo TEXT,
    ruc_companias_transporte TEXT,
    razon_social_companias_transporte TEXT,
    identificaciones_representantes_ventas TEXT,
    nombres_representante_ventas TEXT,

    -- Trámites y Sistema
    tipo_tramite TEXT, -- Tipo Trámite
    fecha_tramite TEXT, -- Fecha de Trámite
    modificacion_sistema TEXT, -- Modificación Sistema
    observaciones_modificacion_sistema TEXT, -- Observaciones Modificación Sistema
    
    -- Columnas Extra
    columna1 TEXT,
    columna2 TEXT,
    
    -- Campos del Sistema CRM (Nuevos)
    research_data TEXT, -- Para la IA
    status TEXT DEFAULT 'pending', -- pending, investigated, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas RLS (Seguridad básica)
ALTER TABLE discovery_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for now" ON discovery_leads
    FOR ALL USING (true) WITH CHECK (true);
