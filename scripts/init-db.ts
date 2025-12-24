import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

async function initDatabase() {
  const dbDir = path.join(process.cwd(), 'data');
  const dbPath = path.join(dbDir, 'crm.db');

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const client = createClient({
    url: `file:${dbPath}`,
  });

  // Create tables
  await client.batch([
    // PROSPECTS TABLE
    `CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      city TEXT,
      province TEXT,
      business_type TEXT,
      outreach_status TEXT DEFAULT 'new',
      whatsapp_status TEXT DEFAULT 'pending',
      whatsapp_sent_at INTEGER,
      email_sequence_step INTEGER DEFAULT 0,
      last_email_sent_at INTEGER,
      next_follow_up INTEGER,
      is_newsletter_subscriber INTEGER DEFAULT 0,
      notes TEXT,
      source TEXT DEFAULT 'import',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    // LEADS TABLE
    `CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      city TEXT,
      address TEXT,
      business_type TEXT,
      connection_type TEXT,
      business_activity TEXT,
      interested_product TEXT,
      verbal_agreements TEXT,
      personality_type TEXT,
      communication_style TEXT,
      key_phrases TEXT,
      strengths TEXT,
      weaknesses TEXT,
      opportunities TEXT,
      threats TEXT,
      relationship_type TEXT,
      quantified_problem TEXT,
      conservative_goal TEXT,
      years_in_business INTEGER,
      number_of_employees INTEGER,
      number_of_branches INTEGER,
      current_clients_per_month INTEGER,
      average_ticket INTEGER,
      known_competition TEXT,
      high_season TEXT,
      critical_dates TEXT,
      facebook_followers INTEGER,
      other_achievements TEXT,
      specific_recognitions TEXT,
      files TEXT DEFAULT '[]',
      audio_transcriptions TEXT DEFAULT '[]',
      quotation TEXT,
      status TEXT DEFAULT 'nuevo',
      phase INTEGER DEFAULT 1,
      notes TEXT,
      source TEXT DEFAULT 'recorridos',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    // CLIENTS TABLE
    `CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      business_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      city TEXT,
      business_type TEXT,
      contract_value REAL,
      contract_start_date INTEGER,
      quotation TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    // QUOTATIONS TABLE
    `CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      introduction TEXT,
      value_proposition TEXT,
      roi_closing TEXT,
      mental_trigger TEXT,
      selected_services TEXT DEFAULT '[]',
      total_amount REAL,
      created_by TEXT DEFAULT 'Michael',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    // CAMPAIGNS TABLE
    `CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      target_count INTEGER DEFAULT 50,
      sent_count INTEGER DEFAULT 0,
      response_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,

    // TASKS TABLE
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date INTEGER,
      assigned_to TEXT,
      related_client_id TEXT REFERENCES clients(id),
      related_lead_id TEXT REFERENCES leads(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    // EVENTS TABLE
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      location TEXT,
      meeting_url TEXT,
      related_client_id TEXT REFERENCES clients(id),
      related_lead_id TEXT REFERENCES leads(id),
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`,

    // INTERACTIONS TABLE
    `CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      direction TEXT,
      content TEXT,
      outcome TEXT,
      duration INTEGER,
      related_client_id TEXT REFERENCES clients(id),
      related_lead_id TEXT REFERENCES leads(id),
      performed_by TEXT,
      performed_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,

    // INDICES
    `CREATE INDEX IF NOT EXISTS idx_prospects_outreach_status ON prospects(outreach_status)`,
    `CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up ON prospects(next_follow_up)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)`,
    `CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time)`,
    `CREATE INDEX IF NOT EXISTS idx_interactions_related_client_id ON interactions(related_client_id)`,
  ], 'write');

  console.log('✅ Database initialized successfully at:', dbPath);
  client.close();
}

initDatabase().catch(console.error);
