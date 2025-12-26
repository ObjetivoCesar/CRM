
import { db } from '@/lib/db';
import { agents, agentBriefings, contacts, events } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export class AgentService {
    /**
     * Ensures an agent exists for a given contact.
     * If not, creates one with default config.
     */
    async ensureAgent(contactId: string) {
        const [existingAgent] = await db
            .select()
            .from(agents)
            .where(eq(agents.contactId, contactId))
            .limit(1);

        if (existingAgent) {
            return existingAgent;
        }

        // Create new agent
        const [newAgent] = await db
            .insert(agents)
            .values({
                contactId,
                config: JSON.stringify({ tone: 'professional' }),
                reliabilityStats: JSON.stringify({ fulfilled: 0, broken: 0, pending: 0 }),
            })
            .returning();

        return newAgent;
    }

    /**
     * Retrieves the agent profile for a contact.
     */
    async getAgentByContact(contactId: string) {
        const [agent] = await db
            .select()
            .from(agents)
            .where(eq(agents.contactId, contactId))
            .limit(1);
        return agent || null;
    }

    /**
     * Retrieves the latest briefing for a specific meeting.
     */
    async getBriefing(meetingId: string) {
        const [briefing] = await db
            .select()
            .from(agentBriefings)
            .where(eq(agentBriefings.meetingId, meetingId))
            .limit(1);
        return briefing || null;
    }

    /**
     * Manually creates a briefing record (used by the LLM service later).
     */
    async saveBriefing(agentId: string, meetingId: string, summary: string, strategy: string, talkingPoints: any) {
        // Check if exists
        const existing = await this.getBriefing(meetingId);

        if (existing) {
            const [updated] = await db
                .update(agentBriefings)
                .set({
                    summary,
                    strategy,
                    talkingPoints: JSON.stringify(talkingPoints),
                })
                .where(eq(agentBriefings.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await db
            .insert(agentBriefings)
            .values({
                agentId,
                meetingId,
                summary,
                strategy,
                talkingPoints: JSON.stringify(talkingPoints),
            })
            .returning();

        return created;
    }
}

export const agentService = new AgentService();
