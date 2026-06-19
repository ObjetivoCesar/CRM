import { NextResponse } from "next/server";
import { db } from '@/lib/db';
import { contacts, contactChannels } from '@/lib/db/schema';
import { eq, or, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allLeads = await db.select()
      .from(contacts)
      .where(eq(contacts.entityType, 'lead'))
      .orderBy(desc(contacts.createdAt));

    // Map to camelCase for frontend (Drizzle already returns camelCase from schema)
    const mappedLeads = allLeads.map(lead => ({
      id: lead.id,
      businessName: lead.businessName,
      contactName: lead.contactName,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      city: lead.city,
      connectionType: lead.connectionType,
      businessActivity: lead.businessActivity,
      interestedProduct: lead.interestedProduct,
      verbalAgreements: lead.verbalAgreements,
      pains: lead.pains,
      goals: lead.goals,
      objections: lead.objections,
      quantifiedProblem: lead.quantifiedProblem,
      conservativeGoal: lead.conservativeGoal,
      personalityType: lead.personalityType,
      communicationStyle: lead.communicationStyle,
      keyPhrases: lead.keyPhrases,
      strengths: lead.strengths,
      weaknesses: lead.weaknesses,
      opportunities: lead.opportunities,
      threats: lead.threats,

      relationshipType: lead.relationshipType,
      yearsInBusiness: lead.yearsInBusiness,
      numberOfEmployees: lead.numberOfEmployees,
      numberOfBranches: lead.numberOfBranches,
      currentClientsPerMonth: lead.currentClientsPerMonth,
      averageTicket: lead.averageTicket,
      birthday: lead.birthday,
      anniversaryDate: lead.anniversaryDate,
      knownCompetition: lead.knownCompetition,
      highSeason: lead.highSeason,
      criticalDates: lead.criticalDates,
      facebookFollowers: lead.facebookFollowers,
      otherAchievements: lead.otherAchievements,
      specificRecognitions: lead.specificRecognitions,

      status: lead.status,
      phase: lead.phase,
      createdAt: lead.createdAt,
      source: lead.source,
      notes: lead.notes,
      investigacion: lead.investigacion,
      researchData: lead.researchData,
      quotation: lead.quotation
    }));

    return NextResponse.json(mappedLeads, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/leads:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}



export async function POST(request: Request) {
  try {
    const body = await request.json();


    // Helper to normalize empty strings to null, but keep undefined as undefined
    // so Drizzle ignores them during partial updates.
    const n = (val: any) => (val === "") ? null : val;

    const drizzleBody: any = {
      phone: n(body.phone),
      email: n(body.email),
      address: n(body.address),
      city: n(body.city),
      province: n(body.province),
      businessType: n(body.businessType),
      connectionType: n(body.relationshipType),
      businessActivity: n(body.businessActivity),
      interestedProduct: Array.isArray(body.interestedProduct) ? body.interestedProduct.join(', ') : n(body.interestedProduct),
      verbalAgreements: n(body.verbalAgreements),
      personalityType: n(body.personalityType),
      communicationStyle: n(body.communicationStyle),
      keyPhrases: n(body.keyPhrases),

      pains: n(body.pains),
      goals: n(body.goals),
      objections: n(body.objections),

      strengths: n(body.strengths),
      weaknesses: n(body.weaknesses),
      opportunities: n(body.opportunities),
      threats: n(body.threats),

      quantifiedProblem: n(body.quantifiedProblem),
      conservativeGoal: n(body.conservativeGoal),
      yearsInBusiness: body.yearsInBusiness ? parseInt(body.yearsInBusiness) : undefined,
      numberOfEmployees: body.numberOfEmployees ? parseInt(body.numberOfEmployees) : undefined,
      numberOfBranches: body.numberOfBranches ? parseInt(body.numberOfBranches) : undefined,
      currentClientsPerMonth: body.currentClientsPerMonth ? parseInt(body.currentClientsPerMonth) : undefined,
      averageTicket: body.averageTicket ? parseInt(body.averageTicket) : undefined,

      // Date handling
      birthday: body.birthday ? new Date(body.birthday) : undefined,
      anniversaryDate: body.anniversaryDate ? new Date(body.anniversaryDate) : undefined,

      knownCompetition: n(body.knownCompetition),
      highSeason: n(body.highSeason),
      criticalDates: n(body.criticalDates),
      facebookFollowers: body.facebookFollowers ? parseInt(body.facebookFollowers) : undefined,
      otherAchievements: n(body.otherAchievements),
      specificRecognitions: n(body.specificRecognitions),

      notes: n(body.notes),
      source: body.source || 'recorridos',
      status: body.status || 'sin_contacto',
      outreachStatus: body.outreachStatus || 'new',
      discoveryLeadId: n(body.discoveryLeadId),
      entityType: 'lead'
    };

    if (body.businessName !== undefined) drizzleBody.businessName = n(body.businessName) || body.contactName || 'Desconocido';
    if (body.contactName !== undefined) drizzleBody.contactName = n(body.contactName) || 'Desconocido';

    // Strip undefined keys from drizzleBody so Drizzle ignores them
    Object.keys(drizzleBody).forEach(key => {
      if (drizzleBody[key] === undefined) {
        delete drizzleBody[key];
      }
    });

    // 1. Deduplication & Identity Resolution
    let contactId = null;

    if (body.phone) {
      const cleanPhone = body.phone.replace(/\D/g, '');

      // A. Check Channels
      const [channelMatch] = await db.select().from(contactChannels)
        .where(or(
          eq(contactChannels.identifier, body.phone),
          eq(contactChannels.identifier, cleanPhone)
        ))
        .limit(1);

      if (channelMatch) {
        contactId = channelMatch.contactId;
      } else {
        // B. Check Legacy Contacts table
        const [legacyMatch] = await db.select().from(contacts)
          .where(or(
            eq(contacts.phone, body.phone),
            eq(contacts.phone, cleanPhone)
          ))
          .limit(1);

        if (legacyMatch) {
          contactId = legacyMatch.id;
          // Auto-heal later
        }
      }
    }

    if (!contactId && body.email) {
      const [emailMatch] = await db.select().from(contacts)
        .where(eq(contacts.email, body.email))
        .limit(1);
      if (emailMatch) contactId = emailMatch.id;
    }

    let finalResult;

    if (contactId) {
      // UPDATE
      drizzleBody.updatedAt = new Date();
      const [updated] = await db.update(contacts)
        .set(drizzleBody)
        .where(eq(contacts.id, contactId))
        .returning();

      finalResult = updated;

      // Auto-heal Channel
      if (body.phone) {
        try {
          const [exists] = await db.select().from(contactChannels)
            .where(and(
              eq(contactChannels.contactId, contactId),
              eq(contactChannels.identifier, body.phone)
            ))
            .limit(1);

          if (!exists) {
            await db.insert(contactChannels).values({
              contactId,
              platform: 'whatsapp',
              identifier: body.phone,
              isPrimary: true
            });
          }
        } catch (e) { /* ignore */ }
      }
    } else {
      // INSERT
      // Fallback required fields for insert if not provided
      if (!drizzleBody.businessName) drizzleBody.businessName = drizzleBody.contactName || body.phone || 'Desconocido';
      if (!drizzleBody.contactName) drizzleBody.contactName = body.phone || 'Desconocido';

      const [inserted] = await db.insert(contacts)
        .values(drizzleBody)
        .returning();

      finalResult = inserted;

      if (body.phone) {
        await db.insert(contactChannels).values({
          contactId: inserted.id,
          platform: 'whatsapp',
          identifier: body.phone,
          isPrimary: true
        });
      }
    }

    // 2. Donna Initialization
    try {
      const { agentService } = await import('@/lib/donna/services/AgentService');
      await agentService.ensureAgent(finalResult.id);
    } catch (e) {
      console.error('⚠️ LeadsAPI Agent Initialization Error:', e);
    }

    return NextResponse.json(finalResult, { status: 201 });
  } catch (error) {
    console.error("Critical Error in POST /api/leads:", error);
    return NextResponse.json({
      error: "Failed to create/update lead",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}