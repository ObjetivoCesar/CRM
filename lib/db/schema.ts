import { pgTable, text, integer, doublePrecision, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

// ============================================
// CONTACTS - Unified table for Prospects, Leads, and Clients
// ============================================
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type', {
    enum: ['prospect', 'lead', 'client']
  }).notNull().default('prospect'),

  // Basic contact info
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  province: text('province'),
  address: text('address'),
  businessType: text('business_type'),

  // Lead/Client fields
  connectionType: text('connection_type'),
  businessActivity: text('business_activity'),
  interestedProduct: text('interested_product'),
  verbalAgreements: text('verbal_agreements'),
  personalityType: text('personality_type'),
  communicationStyle: text('communication_style'),
  keyPhrases: text('key_phrases'),

  // FODA
  strengths: text('strengths'),
  weaknesses: text('weaknesses'),
  opportunities: text('opportunities'),
  threats: text('threats'),

  // Business Data
  relationshipType: text('relationship_type'),
  quantifiedProblem: text('quantified_problem'),
  conservativeGoal: text('conservative_goal'),
  yearsInBusiness: integer('years_in_business'),
  numberOfEmployees: integer('number_of_employees'),
  numberOfBranches: integer('number_of_branches'),
  currentClientsPerMonth: integer('current_clients_per_month'),
  averageTicket: integer('average_ticket'),
  knownCompetition: text('known_competition'),
  highSeason: text('high_season'),
  criticalDates: text('critical_dates'),
  facebookFollowers: integer('facebook_followers'),
  otherAchievements: text('other_achievements'),
  specificRecognitions: text('specific_recognitions'),

  // Files
  files: text('files').default('[]'),
  audioTranscriptions: text('audio_transcriptions').default('[]'),
  quotation: text('quotation'),

  // Lead status
  status: text('status').default('sin_contacto'),
  phase: integer('phase').default(1),

  // Client-specific
  pains: text('pains'),
  goals: text('goals'),
  objections: text('objections'),
  contractValue: doublePrecision('contract_value'),
  contractStartDate: timestamp('contract_start_date'),

  // Prospect-specific
  outreachStatus: text('outreach_status'),
  whatsappStatus: text('whatsapp_status'),
  whatsappSentAt: timestamp('whatsapp_sent_at'),
  emailSequenceStep: integer('email_sequence_step').default(0),
  lastEmailSentAt: timestamp('last_email_sent_at'),
  nextFollowUp: timestamp('next_follow_up'),
  isNewsletterSubscriber: boolean('is_newsletter_subscriber').default(false),

  // Lifecycle tracking
  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id), // ✅ HERENCIA DE IDENTIDAD
  convertedToLeadAt: timestamp('converted_to_lead_at'),
  convertedToClientAt: timestamp('converted_to_client_at'),

  // Metadata
  notes: text('notes'),
  source: text('source').default('recorridos'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Prospects table - Imported database (cold contacts from CSV)
export const prospects = pgTable('prospects', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic contact info
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  province: text('province'),
  businessType: text('business_type'),

  // Outreach tracking
  outreachStatus: text('outreach_status', {
    enum: ['new', 'contacted', 'responded', 'interested', 'not_interested', 'converted_to_lead']
  }).default('new'),

  // WhatsApp tracking
  whatsappStatus: text('whatsapp_status', {
    enum: ['pending', 'sent', 'failed']
  }).default('pending'),
  whatsappSentAt: timestamp('whatsapp_sent_at'),

  // Email tracking
  emailSequenceStep: integer('email_sequence_step').default(0),
  lastEmailSentAt: timestamp('last_email_sent_at'),

  // Follow-up
  nextFollowUp: timestamp('next_follow_up'),

  // Newsletter integration
  isNewsletterSubscriber: boolean('is_newsletter_subscriber').default(false),

  // All CSV data stored as JSON
  notes: text('notes'),
  source: text('source').default('import'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Leads table - ONLY from Recorridos (field capture with demonstrated interest)
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic contact info
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  address: text('address'),
  businessType: text('business_type'),

  // Recorridos / ACC Module Fields
  connectionType: text('connection_type'),
  businessActivity: text('business_activity'),
  interestedProduct: text('interested_product'),
  verbalAgreements: text('verbal_agreements'),
  personalityType: text('personality_type'),
  communicationStyle: text('communication_style'),
  keyPhrases: text('key_phrases'),

  // FODA
  strengths: text('strengths'),
  weaknesses: text('weaknesses'),
  opportunities: text('opportunities'),
  threats: text('threats'),

  // Advanced Business Data
  relationshipType: text('relationship_type'),
  quantifiedProblem: text('quantified_problem'),
  conservativeGoal: text('conservative_goal'),
  yearsInBusiness: integer('years_in_business'),
  numberOfEmployees: integer('number_of_employees'),
  numberOfBranches: integer('number_of_branches'),
  currentClientsPerMonth: integer('current_clients_per_month'),
  averageTicket: integer('average_ticket'),
  knownCompetition: text('known_competition'),
  highSeason: text('high_season'),
  criticalDates: text('critical_dates'),
  facebookFollowers: integer('facebook_followers'),
  otherAchievements: text('other_achievements'),
  specificRecognitions: text('specific_recognitions'),

  // Files & Transcriptions (stored as JSONB in Postgres)
  files: text('files').default('[]'),
  audioTranscriptions: text('audio_transcriptions').default('[]'),

  // Quotation
  quotation: text('quotation'),

  // Lead status (from Recorridos workflow + Contact stages for Kanban)
  status: text('status', {
    enum: ['sin_contacto', 'primer_contacto', 'segundo_contacto', 'tercer_contacto', 'cotizado', 'convertido']
  }).default('sin_contacto'),
  phase: integer('phase').default(1),

  // Metadata
  notes: text('notes'),
  source: text('source').default('recorridos'),

  // Missing columns restored to prevent data loss
  outreachStatus: text('outreach_status', {
    enum: ['new', 'contacted', 'responded', 'interested', 'not_interested', 'converted_to_lead']
  }).default('new'),
  whatsappStatus: text('whatsapp_status', {
    enum: ['pending', 'sent', 'failed']
  }).default('pending'),
  emailSequenceStep: integer('email_sequence_step').default(0),
  isNewsletterSubscriber: boolean('is_newsletter_subscriber').default(false),

  // Discovery link
  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id),

  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  address: text('address'),
  businessType: text('business_type'),

  // Recorridos / ACC Module Fields (Mirrored from Leads for consistency)
  businessActivity: text('business_activity'),
  interestedProduct: text('interested_product'),
  verbalAgreements: text('verbal_agreements'),
  personalityType: text('personality_type'),
  communicationStyle: text('communication_style'),
  keyPhrases: text('key_phrases'),

  // Strategic Profiling
  pains: text('pains'),
  goals: text('goals'),
  objections: text('objections'),
  strengths: text('strengths'),
  weaknesses: text('weaknesses'),
  opportunities: text('opportunities'),
  threats: text('threats'),

  // Advanced Business Data
  relationshipType: text('relationship_type'),
  quantifiedProblem: text('quantified_problem'),
  conservativeGoal: text('conservative_goal'),
  yearsInBusiness: integer('years_in_business'),
  numberOfEmployees: integer('number_of_employees'),
  numberOfBranches: integer('number_of_branches'),
  currentClientsPerMonth: integer('current_clients_per_month'),
  averageTicket: integer('average_ticket'),
  knownCompetition: text('known_competition'),
  highSeason: text('high_season'),
  criticalDates: text('critical_dates'),
  facebookFollowers: integer('facebook_followers'),
  otherAchievements: text('other_achievements'),
  specificRecognitions: text('specific_recognitions'),

  contractValue: doublePrecision('contract_value'),
  contractStartDate: timestamp('contract_start_date'),
  quotation: text('quotation'),

  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Quotations Table
export const quotations = pgTable('quotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id),
  title: text('title').notNull(),
  status: text('status', { enum: ['draft', 'sent', 'approved', 'rejected'] }).default('draft'),

  introduction: text('introduction'),
  valueProposition: text('value_proposition'),
  roiClosing: text('roi_closing'),

  mentalTrigger: text('mental_trigger'),
  selectedServices: text('selected_services').default('[]'),
  totalAmount: doublePrecision('total_amount'),

  createdBy: text('created_by').default('Michael'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Campaigns
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type', { enum: ['whatsapp', 'email'] }).notNull(),
  status: text('status', { enum: ['draft', 'active', 'paused', 'completed'] }).default('draft'),
  targetCount: integer('target_count').default(50),
  sentCount: integer('sent_count').default(0),
  responseCount: integer('response_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tasks Table
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'done', 'cancelled'] }).default('todo'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
  dueDate: timestamp('due_date'),

  assignedTo: text('assigned_to'), // User ID or Name
  contactId: uuid('contact_id').references(() => contacts.id), // ✅ NUEVO: Referencia unificada
  relatedClientId: uuid('related_client_id').references(() => clients.id),
  relatedLeadId: uuid('related_lead_id').references(() => leads.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Events Table
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  location: text('location'),
  meetingUrl: text('meeting_url'),
  contactId: uuid('contact_id').references(() => contacts.id), // ✅ NUEVO: Referencia unificada
  relatedClientId: uuid('related_client_id').references(() => clients.id),
  relatedLeadId: uuid('related_lead_id').references(() => leads.id),

  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Interactions Table (The "Clinical History")
export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type', { enum: ['call', 'email', 'meeting', 'whatsapp', 'note', 'other'] }).notNull(),
  direction: text('direction', { enum: ['inbound', 'outbound'] }), // For calls/messages

  content: text('content'), // Summary or body
  outcome: text('outcome'), // e.g., "Answered", "Left Voicemail", "Interested"
  duration: integer('duration'), // In minutes, for calls/meetings

  contactId: uuid('contact_id').references(() => contacts.id), // ✅ UNIFIED REFERENCE (Optional for discovery leads)
  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id), // ✅ Reference for discovery leads before conversion

  performedBy: text('performed_by'), // User who did the interaction
  performedAt: timestamp('performed_at').defaultNow().notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Financial Module
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type', { enum: ['INCOME', 'EXPENSE'] }).notNull(),
  category: text('category').notNull(), // e.g., 'Venta', 'Anticipo', 'Sueldo', 'Servicios'
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),

  // Dates
  date: timestamp('date').notNull(),
  dueDate: timestamp('due_date'), // For reminders

  // Status & Payment
  status: text('status', { enum: ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'] }).notNull().default('PENDING'),
  paymentMethod: text('payment_method'), // 'Transferencia', 'Efectivo', 'Tarjeta'

  // Relations
  clientId: uuid('client_id').references(() => clients.id), // Link to Client
  leadId: uuid('lead_id').references(() => leads.id),     // Link to Lead (for early payments)

  // Metadata & Recurrence
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: text('recurrence_rule'), // 'MONTHLY', 'YEARLY'
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const financialGoals = pgTable('financial_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  revenueTarget: doublePrecision('revenue_target').notNull(),
  expenseLimit: doublePrecision('expense_limit'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: integer('Source_ID'),
  name: text('Nombre del Producto o Servicio').notNull(),
  price: doublePrecision('Precio'),
  description: text('Descripción'),
  benefits: text('Beneficios'),

  category: text('Categoría para Blog'),
  subCategory: text('Categoría Interna / Subcategoría'),
  tags: text('Etiqueta'),

  paymentForm: text('Forma de pago'),
  videoUrl: text('Link Video'),
  servicesIncluded: text('Servicios Incluidos (Ejemplo base)'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contracts Table (NEW)
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id),
  leadId: uuid('lead_id').references(() => leads.id),

  title: text('title').notNull(),
  status: text('status', { enum: ['draft', 'pending_signature', 'signed', 'void'] }).default('draft'),

  // Contract content stored as structured data
  contractData: text('contract_data'), // JSON with all filled fields

  // PDF generation
  pdfUrl: text('pdf_url'),

  // Signature tracking
  signedAt: timestamp('signed_at'),
  signedBy: text('signed_by'),

  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Discovery Module (NEW)
// Discovery Module - Full CSV Structure
export const discoveryLeads = pgTable('discovery_leads', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identificación
  ruc: text('ruc'),
  codigoEstablecimientoRuc: text('codigo_establecimiento_ruc'),
  estadoRuc: text('estado_ruc'),
  nombreComercial: text('nombre_comercial').notNull(),
  numeroRegistro: text('numero_registro'),
  fechaRegistro: text('fecha_registro'),

  // Clasificación
  actividadModalidad: text('actividad_modalidad'),
  clasificacion: text('clasificacion'),
  categoria: text('categoria'),

  // Legal
  razonSocialPropietario: text('razon_social_propietario'),
  representanteLegal: text('representante_legal'),
  tipoPersoneriaJuridica: text('tipo_personeria_juridica'),
  personeriaJuridica: text('personeria_juridica'),

  // Ubicación
  provincia: text('provincia'),
  canton: text('canton'),
  parroquia: text('parroquia'),
  tipoParroquia: text('tipo_parroquia'),
  direccion: text('direccion'),
  referenciaDireccion: text('referencia_direccion'),
  latitud: text('latitud'),
  longitud: text('longitud'),
  zonaTuristica: text('zona_turistica'),
  administracionZonal: text('administracion_zonal'),
  sectorTuristico: text('sector_turistico'),

  // Contacto
  telefonoPrincipal: text('telefono_principal'),
  telefonoSecundario: text('telefono_secundario'),
  correoElectronico: text('correo_electronico'),
  direccionWeb: text('direccion_web'),
  personaContacto: text('persona_contacto'),
  correoPersonaContacto: text('correo_persona_contacto'),

  // Operativo
  tipoLocal: text('tipo_local'),
  tipoEstablecimiento: text('tipo_establecimiento'),
  nombreFranquiciaCadena: text('nombre_franquicia_cadena'),
  estadoRegistroEstablecimiento: text('estado_registro_establecimiento'),
  sistemaOrigen: text('sistema_origen'),
  estadoRegistroConDeuda: text('estado_registro_con_deuda'),

  // Personal
  totalTrabajadores: integer('total_trabajadores'),
  totalTrabajadoresHombres: integer('total_trabajadores_hombres'),
  totalTrabajadoresMujeres: integer('total_trabajadores_mujeres'),

  // Capacidades
  totalHabitacionesTiendas: integer('total_habitaciones_tiendas'),
  totalCamas: integer('total_camas'),
  totalPlazas: integer('total_plazas'),
  totalMesas: integer('total_mesas'),
  totalCapacidadesPersonas: integer('total_capacidades_personas'),

  // Extra Data (Json-like text or specific fields as needed)
  tituloHabilitante: text('titulo_habilitante'),
  tipoVehiculo: text('tipo_vehiculo'),
  matricula: text('matricula'),
  tipoEmbarcaciones: text('tipo_embarcaciones'),

  // Tagging System (columna1 = contact status, columna2 = action)
  columna1: text('columna1', {
    enum: ['no_contactado', 'no_contesto', 'contesto_interesado', 'contesto_no_interesado', 'buzon_voz', 'numero_invalido']
  }).default('no_contactado'),
  columna2: text('columna2', {
    enum: ['pendiente', 'en_cola', 'convertir_a_lead', 'descartar', 'seguimiento_7_dias', 'seguimiento_30_dias']
  }).default('pendiente'),

  // CRM System Fields
  researchData: text('research_data'),
  bookingInfo: text('booking_info'),
  googleInfo: text('google_info'),
  status: text('status', {
    enum: ['pending', 'investigated', 'no_answer', 'not_interested', 'sent_info', 'converted']
  }).default('pending'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Call Analyses Table for the Trainer module (NEW)
export const callAnalyses = pgTable('call_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id),
  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id),
  audioUrl: text('audio_url'),
  transcription: text('transcription'), // JSONB in DB, text in Drizzle (or JSONB if configured)
  metrics: text('metrics'), // JSON
  feedback: text('feedback'), // JSON
  nextFocus: text('next_focus'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
