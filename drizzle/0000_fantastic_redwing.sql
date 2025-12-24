CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft',
	"target_count" integer DEFAULT 50,
	"sent_count" integer DEFAULT 0,
	"response_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"business_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text,
	"email" text,
	"city" text,
	"business_type" text,
	"contract_value" double precision,
	"contract_start_date" timestamp,
	"quotation" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"lead_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft',
	"contract_data" text,
	"pdf_url" text,
	"signed_at" timestamp,
	"signed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" text,
	"meeting_url" text,
	"related_client_id" uuid,
	"related_lead_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"revenue_target" double precision NOT NULL,
	"expense_limit" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"direction" text,
	"content" text,
	"outcome" text,
	"duration" integer,
	"related_client_id" uuid,
	"related_lead_id" uuid,
	"performed_by" text,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text,
	"email" text,
	"city" text,
	"address" text,
	"business_type" text,
	"connection_type" text,
	"business_activity" text,
	"interested_product" text,
	"verbal_agreements" text,
	"personality_type" text,
	"communication_style" text,
	"key_phrases" text,
	"strengths" text,
	"weaknesses" text,
	"opportunities" text,
	"threats" text,
	"relationship_type" text,
	"quantified_problem" text,
	"conservative_goal" text,
	"years_in_business" integer,
	"number_of_employees" integer,
	"number_of_branches" integer,
	"current_clients_per_month" integer,
	"average_ticket" integer,
	"known_competition" text,
	"high_season" text,
	"critical_dates" text,
	"facebook_followers" integer,
	"other_achievements" text,
	"specific_recognitions" text,
	"files" text DEFAULT '[]',
	"audio_transcriptions" text DEFAULT '[]',
	"quotation" text,
	"status" text DEFAULT 'sin_contacto',
	"phase" integer DEFAULT 1,
	"notes" text,
	"source" text DEFAULT 'recorridos',
	"outreach_status" text DEFAULT 'new',
	"whatsapp_status" text DEFAULT 'pending',
	"email_sequence_step" integer DEFAULT 0,
	"is_newsletter_subscriber" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" integer,
	"name" text NOT NULL,
	"price" double precision NOT NULL,
	"description" text,
	"benefits" text,
	"category" text,
	"sub_category" text,
	"tags" text,
	"payment_form" text,
	"video_url" text,
	"services_included" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text,
	"email" text,
	"city" text,
	"province" text,
	"business_type" text,
	"outreach_status" text DEFAULT 'new',
	"whatsapp_status" text DEFAULT 'pending',
	"whatsapp_sent_at" timestamp,
	"email_sequence_step" integer DEFAULT 0,
	"last_email_sent_at" timestamp,
	"next_follow_up" timestamp,
	"is_newsletter_subscriber" boolean DEFAULT false,
	"notes" text,
	"source" text DEFAULT 'import',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft',
	"introduction" text,
	"value_proposition" text,
	"roi_closing" text,
	"mental_trigger" text,
	"selected_services" text DEFAULT '[]',
	"total_amount" double precision,
	"created_by" text DEFAULT 'Michael',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo',
	"priority" text DEFAULT 'medium',
	"due_date" timestamp,
	"assigned_to" text,
	"related_client_id" uuid,
	"related_lead_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"payment_method" text,
	"client_id" uuid,
	"lead_id" uuid,
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_related_client_id_clients_id_fk" FOREIGN KEY ("related_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_related_lead_id_leads_id_fk" FOREIGN KEY ("related_lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_related_client_id_clients_id_fk" FOREIGN KEY ("related_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_related_lead_id_leads_id_fk" FOREIGN KEY ("related_lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_related_client_id_clients_id_fk" FOREIGN KEY ("related_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_related_lead_id_leads_id_fk" FOREIGN KEY ("related_lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;