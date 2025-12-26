
import { db } from '@/lib/db';
import { commitments, agents, events } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';

export type CommitmentStatus = 'draft' | 'active' | 'at_risk' | 'fulfilled' | 'broken';
export type Severity = 'low' | 'medium' | 'high';
export type ActorRole = 'client' | 'internal_team' | 'cesar';

export class CommitmentService {
    /**
     * Creates a DRAFT commitment. 
     * Must be approved by human to become ACTIVE.
     */
    async createDraft(params: {
        agentId: string;
        meetingId: string;
        title: string;
        description?: string;
        actorRole: ActorRole;
        assigneeName?: string;
        dueDate?: Date;
        severity?: Severity;
    }) {
        const [draft] = await db
            .insert(commitments)
            .values({
                ...params,
                status: 'draft',
                gracePeriodDays: 1, // Default tolerance
            })
            .returning();
        return draft;
    }

    /**
     * Activates a draft after human review.
     */
    async activateCommitment(id: string) {
        const [active] = await db
            .update(commitments)
            .set({ status: 'active' })
            .where(eq(commitments.id, id))
            .returning();
        return active;
    }

    /**
     * Mark as Fulfilled.
     */
    async fulfillCommitment(id: string) {
        const [fulfilled] = await db
            .update(commitments)
            .set({ status: 'fulfilled' })
            .where(eq(commitments.id, id))
            .returning();

        // TODO: Update agent reliability stats here
        return fulfilled;
    }

    /**
     * Get drafts for a meeting (to show in the Review Modal).
     */
    async getDraftsByMeeting(meetingId: string) {
        return db
            .select()
            .from(commitments)
            .where(and(
                eq(commitments.meetingId, meetingId),
                eq(commitments.status, 'draft')
            ));
    }

    /**
     * Get active commitments for an agent (Client View).
     */
    async getActiveByAgent(agentId: string) {
        return db
            .select()
            .from(commitments)
            .where(and(
                eq(commitments.agentId, agentId),
                eq(commitments.status, 'active')
            ));
    }
}

export const commitmentService = new CommitmentService();
