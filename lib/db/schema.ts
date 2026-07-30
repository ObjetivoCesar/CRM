import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, pgEnum, unique, index, doublePrecision } from 'drizzle-orm/pg-core';

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

  // Automated Planning Data
  birthday: timestamp('birthday'),
  anniversaryDate: timestamp('anniversary_date'),
  categoryTags: text('category_tags').array().default([]),
  whatsappOptOut: boolean('whatsapp_opt_out').default(false),

  // LOPDP Legal Consent
  aceptoProteccion: boolean('acepto_proteccion').default(false),
  aceptoFecha: timestamp('acepto_fecha'),

  // Metadata
  notes: text('notes'),
  investigacion: text('investigacion'), // Legacy field
  researchData: jsonb('research_data'), // NEW Consolidated Field
  source: text('source').default('recorridos'),
  // Identity Merging & Omnichannel
  clientId: uuid('client_id').references(() => clients.id), // ✅ THE LINK: Multiple contacts -> One Client
  channelSource: text('channel_source').default('whatsapp'), // 'whatsapp', 'telegram'
  botMode: text('bot_mode', { enum: ['active', 'paused', 'disabled', 'co-pilot'] }).default('active'), // ✅ HANDOVER: Bot status for this contact
  lastActivityAt: timestamp('last_activity_at'), // For inbox sorting
  unreadCount: integer('unread_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contact Channels table - The "Phone Book" for Identity Merging
export const contactChannels = pgTable('contact_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  platform: text('platform').notNull(), // 'whatsapp', 'telegram', 'instagram'
  identifier: text('identifier').notNull(), // phone number, chat_id, handle
  isPrimary: boolean('is_primary').default(false),
  verified: boolean('verified').default(false), // e.g. OTP verified or trusted source

  // Metadata for the specific channel (e.g. username, profile pic url specific to platform)
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  // Ensure one identifier doesn't belong to multiple contacts on the same platform
  unq: unique().on(t.platform, t.identifier),
  // Index for fast lookups
  identifierIdx: index('contact_channels_identifier_idx').on(t.identifier)
}));

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

  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id),
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
  type: text('type', { enum: ['whatsapp', 'email', 'meta_ads'] }).notNull(),
  status: text('status', { enum: ['draft', 'active', 'paused', 'completed'] }).default('draft'),
  externalId: text('external_id'), // Meta Campaign ID
  budget: doublePrecision('budget'),
  targetCount: integer('target_count').default(50),
  sentCount: integer('sent_count').default(0),
  responseCount: integer('response_count').default(0),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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

  reminderAt: timestamp('reminder_at'),
  reminderSent: boolean('reminder_sent').default(false),

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
  status: text('status', { enum: ['scheduled', 'cancelled', 'completed'] }).default('scheduled'),
  contactId: uuid('contact_id').references(() => contacts.id), // ✅ NUEVO: Referencia unificada
  relatedClientId: uuid('related_client_id').references(() => clients.id),
  relatedLeadId: uuid('related_lead_id').references(() => leads.id),

  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Interactions Table (The "Clinical History")
export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type', { enum: ['call', 'email', 'meeting', 'whatsapp', 'instagram', 'instagram_comment', 'facebook', 'facebook_comment', 'telegram', 'note', 'other'] }).notNull(),
  direction: text('direction', { enum: ['inbound', 'outbound'] }), // For calls/messages

  content: text('content'), // Summary or body
  outcome: text('outcome'), // e.g., "Answered", "Left Voicemail", "Interested"
  duration: integer('duration'), // In minutes, for calls/meetings

  contactId: uuid('contact_id').references(() => contacts.id), // ✅ UNIFIED REFERENCE (Optional for discovery leads)
  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id), // ✅ Reference for discovery leads before conversion

  performedBy: text('performed_by'), // User who did the interaction
  performedAt: timestamp('performed_at').defaultNow().notNull(),

  metadata: jsonb('metadata').default({}), // ✅ ROBUST LOGGING: For raw payloads/extra info

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  contactIdIdx: index('interactions_contact_id_idx').on(t.contactId),
  performedAtIdx: index('interactions_performed_at_idx').on(t.performedAt),
}));

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

  // Advanced Categorization
  subType: text('sub_type', { enum: ['PERSONAL', 'BUSINESS_FIXED', 'BUSINESS_VARIABLE'] }),

  // Relations
  clientId: uuid('client_id').references(() => clients.id), // Link to Client
  leadId: uuid('lead_id').references(() => leads.id),     // Link to Lead (for early payments)
  parentTransactionId: uuid('parent_transaction_id'), // For linking Anticipo/Saldo or Installments

  // Metadata & Recurrence
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: text('recurrence_rule'), // 'MONTHLY', 'YEARLY'
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const personalLiabilities = pgTable('personal_liabilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // e.g., 'Banco de Loja', 'Cuota Casa'
  category: text('category').notNull(), // 'Vivienda', 'Prestamo', 'Servicios'
  monthlyPayment: doublePrecision('monthly_payment').notNull(),
  totalDebt: doublePrecision('total_debt'), // Total owed
  remainingDebt: doublePrecision('remaining_debt'), // Current balance
  dueDate: integer('due_date'), // Day of the month (1-31)
  status: text('status', { enum: ['UP_TO_DATE', 'PENDING', 'OVERDUE'] }).default('UP_TO_DATE'),
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

// Contract Templates Table (NEW)
export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // e.g. 'hotel', 'restaurant'
  name: text('name').notNull(),
  description: text('description'),

  // Array of TemplateField objects: { id, label, type, options, defaultValue, placeholder, required }
  fields: jsonb('fields').notNull().default([]),

  // The Markdown/Text with {{PLACEHOLDERS}}
  contentTemplate: text('content_template').notNull(),

  // Logic for derived fields (optional, stored as a script string if needed, but for now simple replacement)
  // For now we'll handle complex logic in the code, but basic fields in the template.

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
  investigacion: text('investigacion'), // Added based on user feedback
  status: text('status', {
    enum: ['pending', 'investigated', 'no_answer', 'not_interested', 'sent_info', 'converted', 'discarded']
  }).default('pending'),
  botMode: text('bot_mode', { enum: ['active', 'paused', 'disabled', 'co-pilot'] }).default('active'),



  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Call Analyses Table for the Trainer module (NEW)
export const callAnalyses = pgTable('call_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  leadId: uuid('lead_id').references(() => leads.id),
  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id),
  audioUrl: text('audio_url'),
  transcription: text('transcription'), // JSONB in DB, text in Drizzle (or JSONB if configured)
  metrics: text('metrics'), // JSON
  feedback: text('feedback'), // JSON
  nextFocus: text('next_focus'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// DONNA MODULE (v1.2 - Hardened Reliability)
// ============================================

// 1. Agents (The Internal Expert Profile)
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull().unique().references(() => contacts.id, { onDelete: 'cascade' }),

  // Relationship Health
  currentRiskScore: integer('current_risk_score').default(0),
  reliabilityStats: text('reliability_stats').default('{"fulfilled": 0, "broken": 0, "pending": 0}'), // JSONB in DB

  // Config
  config: text('config').default('{}'), // JSONB
  specialInstructions: text('special_instructions'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastPlannedAt: timestamp('last_planned_at'),
});

// 2. Agent Briefings (Pre-Meeting Output)
export const agentBriefings = pgTable('agent_briefings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id').references(() => events.id, { onDelete: 'set null' }),

  summary: text('summary'),
  strategy: text('strategy'),
  talkingPoints: text('talking_points'), // JSONB

  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Commitments (The Ledger of Promises)
export const commitments = pgTable('commitments', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id').references(() => events.id, { onDelete: 'set null' }),

  title: text('title').notNull(),
  description: text('description'),

  // Responsibility
  actorRole: text('actor_role', { enum: ['client', 'internal_team', 'cesar'] }),
  assigneeUserId: text('assignee_user_id'),
  assigneeName: text('assignee_name'),

  // Timing
  dueDate: timestamp('due_date', { withTimezone: true }),
  gracePeriodDays: integer('grace_period_days').default(0),

  // State Machine
  status: text('status', {
    enum: ['draft', 'active', 'at_risk', 'fulfilled', 'broken']
  }).default('draft'),

  severity: text('severity', {
    enum: ['low', 'medium', 'high']
  }).default('medium'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// LOYALTY MISSIONS (Fidelization System)
// ============================================
export const loyaltyMissions = pgTable('loyalty_missions', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source', { enum: ['micro', 'macro'] }).notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'scheduled', 'executed', 'cancelled', 'rejected', 'suggested_rejected']
  }).notNull().default('pending'),
  plannedAt: timestamp('planned_at', { withTimezone: true }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// REMINDERS (Internal Task Notifications)
// ============================================
export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  sendAt: timestamp('send_at', { withTimezone: true }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'cancelled', 'failed'] }).default('pending').notNull(),
  channel: text('channel', { enum: ['telegram', 'whatsapp'] }).default('telegram').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// CONVERSATIONAL STATE (Short-term Memory)
// ============================================
export const conversationStates = pgTable('conversation_states', {
  key: text('key').primaryKey(), // chatId
  data: text('data').default('{}'), // JSON stored as text
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// WHATSAPP LOGS - Auditory and Antiban tracking
// ============================================
export const whatsappLogs = pgTable('whatsapp_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
  trigger: text('trigger').notNull(), // 'donna', 'finance', 'manual', 'test'
  content: text('content').notNull(),
  status: text('status', {
    enum: ['sent', 'failed', 'rejected', 'processing']
  }).notNull().default('processing'),
  errorMessage: text('error_message'),
  approvedBy: text('approved_by'), // ID of the user who approved
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
// ============================================
// CHAT HISTORY (Long-term Memory & debugging)
// ============================================
export const donnaChatMessages = pgTable('donna_chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: text('chat_id').notNull(), // Telegram/Whatsapp ID
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  platform: text('platform', { enum: ['telegram', 'whatsapp', 'instagram', 'facebook'] }).default('whatsapp'),
  messageTimestamp: timestamp('message_timestamp').defaultNow().notNull(), // Unified Context Timestamp
  metadata: jsonb('metadata').default({}), // For Intent, debugging info
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  chatIdIdx: index('donna_chat_messages_chat_id_idx').on(t.chatId),
  messageTimestampIdx: index('donna_chat_messages_timestamp_idx').on(t.messageTimestamp),
}));

// ============================================
// SYSTEM SETTINGS - Credentials and Configurations
// ============================================
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(), // 'instagram_config', 'telegram_config', etc.
  value: jsonb('value').notNull().default({}),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
// ============================================
// LEADS CAPTURAR CLIENTES - From PDF QR Multi-step Form
// ============================================
export const leadsCapturarClientes = pgTable('leads_capturar_clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name'),
  phone: text('phone'),
  location: text('location'),
  referralSource: text('referral_source'),
  birthDate: text('birth_date'), // Store as text or date
  suggestions: text('suggestions'),
  currentStep: integer('current_step').default(1),
  status: text('status', { enum: ['incomplete', 'completed'] }).default('incomplete'),

  // Metadata & Tracking
  source: text('source').default('pdf_qr_carnaval'),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
// ============================================
// MESSAGE QUEUE (For Debouncing/Accumulation)
// ============================================
export const pendingMessagesQueue = pgTable('pending_messages_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: text('chat_id').notNull(),
  content: text('content').notNull(),
  platform: text('platform').default('whatsapp'),
  metadata: jsonb('metadata').default({}),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  claimedAt: timestamp('claimed_at'), // To prevent multiple workers from processing the same chat
  failedAt: timestamp('failed_at'),   // Set when processing fails — used for dead-letter detection
  retryCount: integer('retry_count').default(0).notNull(), // How many times has this message been retried
});

// ============================================
// CONVERSATIONAL SESSIONS (State Machine for long-running workflows)
// ============================================
export const conversationalSessions = pgTable('conversational_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  chatId: text('chat_id').notNull(), // The WhatsApp/Telegram identifier
  status: text('status', { enum: ['open', 'reviewing', 'paused', 'closed', 'abandoned'] }).default('open').notNull(),
  documentType: text('document_type', { enum: ['COTIZACION', 'PROPUESTA', 'CONTRATO'] }).notNull(),
  collectedData: jsonb('collected_data').default({}), // The JSON that accumulates state
  lastGeneratedText: text('last_generated_text'), // The actual text/markdown body of the active PDF
  metadata: jsonb('metadata').default({}), // Any extra tracking info
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  chatIdIdx: index('conversational_sessions_chat_id_idx').on(t.chatId),
  statusIdx: index('conversational_sessions_status_idx').on(t.status),
}));

// ============================================
// ============================================
// LOPDP LEGAL CONSENT (Audit Trail for activaqr.com/privacidad)
// ============================================
export const lopdpConsentimientos = pgTable('lopdp_consentimientos', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditId: text('audit_id').notNull(),
  numero: text('numero').notNull(),
  nombre: text('nombre'),
  email: text('email'),
  aceptaComercial: boolean('acepta_comercial').default(true),
  ip: text('ip'),
  userAgent: text('user_agent'),
  version: text('version'),
  urlOrigen: text('url_origen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// DONNA BRAINS: INSTRUCTIONAL RAG (Long-term Knowledge Base)
// ============================================
export const donnaInstructions = pgTable('donna_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category', { enum: ['commercial', 'personality', 'formatting', 'product_mapping'] }).notNull(),
  instruction: text('instruction').notNull(), // "Always use 'César' instead of 'Cheche'"
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}), // Who added it, context, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// DONNA BRAINS: SESSION TELEMETRY (For Learning Extraction)
// ============================================
export const donnaSessionTelemetry = pgTable('donna_session_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => conversationalSessions.id, { onDelete: 'cascade' }).notNull(),
  initialRequest: text('initial_request').notNull(), // What the user originally asked
  finalDocumentText: text('final_document_text'), // The successful text output
  iterationCount: integer('iteration_count').default(0).notNull(), // How many times it was modified
  wasSuccessful: boolean('was_successful').default(true).notNull(), // Did it end in 'closed' or 'abandoned'?
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// SOCIAL MEDIA SCHEDULER (Meta Posting)
// ============================================

export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: text('platform', { enum: ['facebook', 'instagram'] }).notNull(),
  accountId: text('account_id').notNull(), // The Facebook Page ID or IG User ID
  accountName: text('account_name'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const socialPosts = pgTable('social_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => socialAccounts.id, { onDelete: 'cascade' }).notNull(),
  content: text('content'), // The text/caption
  mediaUrls: jsonb('media_urls').default('[]'), // Array of image/video URLs
  mediaType: text('media_type', { enum: ['IMAGE', 'VIDEO', 'CAROUSEL'] }).default('IMAGE').notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(), // When it should be posted
  status: text('status', { enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'] }).default('draft').notNull(),
  metaPostId: text('meta_post_id'), // The ID returned by Meta after successful publishing
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// CO-PILOT: MESSAGE SUGGESTIONS
// Draft responses generated by Donna for human review before sending
// ============================================
export const messageSuggestions = pgTable('message_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: text('chat_id').notNull(),            // The WhatsApp number / identifier
  suggestedResponse: text('suggested_response').notNull(), // What Donna wants to say
  contextSnapshot: jsonb('context_snapshot').default({}),  // Ficha + last N messages at generation time
  status: text('status', {
    enum: ['pending', 'approved', 'edited', 'discarded', 'expired']
  }).default('pending').notNull(),
  expiresAt: timestamp('expires_at').notNull(), // Auto-expires if client writes again (or after 10 min)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// CO-PILOT: AI TRAINING LOGS
// Stores the diff between Donna's suggestion and what César actually sent
// Used to improve prompts over time
// ============================================
export const aiTrainingLogs = pgTable('ai_training_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: text('chat_id').notNull(),
  suggestionId: uuid('suggestion_id').references(() => messageSuggestions.id, { onDelete: 'set null' }),
  originalAiResponse: text('original_ai_response').notNull(),   // What Donna suggested
  humanCorrectedResponse: text('human_corrected_response'),     // What César actually sent (null if approved as-is)
  wasApproved: boolean('was_approved').default(false).notNull(),// true = sent without edits
  correctionReason: text('correction_reason', {
    enum: ['context', 'tone', 'wrong_info']                     // Why was it corrected?
  }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// WEBHOOK IDEMPOTENCY (Anti-duplicate processing)
// Prevents Meta retries from causing duplicate vCard sends, messages, etc.
// Table already exists in DB via migration 016_create_webhooks_idempotency.sql
// ============================================
export const webhookEventsProcessed = pgTable('webhook_events_processed', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(), // 'whatsapp', 'telegram', 'instagram'
  externalId: text('external_id').notNull(), // The message.id from Meta
  processedAt: timestamp('processed_at').defaultNow(),
}, (t) => ({
  unq: unique().on(t.provider, t.externalId),
  externalIdx: index('idx_webhook_events_ext').on(t.provider, t.externalId),
}));

// ============================================
// REFERRAL LEADS (Integration with BarberosPlus)
// Stores incoming leads that scan QR codes.
// ============================================
export const referralLeads = pgTable('referral_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull(),
  referralCode: text('referral_code').notNull(), // e.g. REF-123
  clientName: text('client_name'),
  sessionState: text('session_state', {
    enum: ['NEW_LEAD', 'AWAITING_QUESTION_ANSWER', 'SEQUENCE_COMPLETED', 'HANDOVER_CESAR']
  }).default('NEW_LEAD'),
  converted: boolean('converted').default(false).notNull(),
  capturedAt: timestamp('captured_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
