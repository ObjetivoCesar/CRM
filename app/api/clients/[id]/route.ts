import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    try {
        const clientId = params.id;

        // 1. Fetch client details
        const { data: client, error: clientError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', clientId)
            .eq('entity_type', 'client')
            .single();

        if (clientError || !client) {
            console.error('Error fetching client:', clientError);
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const mappedClient = {
            id: client.id,
            businessName: client.business_name,
            contactName: client.contact_name,
            phone: client.phone,
            email: client.email,
            city: client.city,
            address: client.address,
            businessType: client.business_type,
            businessActivity: client.business_activity,
            interestedProduct: client.interested_product,
            verbalAgreements: client.verbal_agreements,
            personalityType: client.personality_type,
            communicationStyle: client.communication_style,
            keyPhrases: client.key_phrases,
            pains: client.pains,
            goals: client.goals,
            objections: client.objections,
            strengths: client.strengths,
            weaknesses: client.weaknesses,
            opportunities: client.opportunities,
            threats: client.threats,
            relationshipType: client.relationship_type,
            quantifiedProblem: client.quantified_problem,
            conservativeGoal: client.conservative_goal,
            yearsInBusiness: client.years_in_business,
            numberOfEmployees: client.number_of_employees,
            numberOfBranches: client.number_of_branches,
            currentClientsPerMonth: client.current_clients_per_month,
            averageTicket: client.average_ticket,
            knownCompetition: client.known_competition,
            highSeason: client.high_season,
            criticalDates: client.critical_dates,
            facebookFollowers: client.facebook_followers,
            otherAchievements: client.other_achievements,
            specificRecognitions: client.specific_recognitions,
            contractValue: client.contract_value,
            contractStartDate: client.contract_start_date,
            quotation: client.quotation,
            notes: client.notes,
        };

        // 2. Fetch related data (parallel)
        // We use try-catch blocks individually or safe awaits to prevent one failure from blocking the others
        // Assuming database uses 'related_client_id' based on previous Drizzle code

        const fetchInteractions = async () => {
            const { data } = await supabase.from('interactions').select('*').eq('contact_id', clientId);
            return data?.map((i: any) => ({
                id: i.id,
                type: i.type,
                direction: i.direction,
                content: i.content,
                outcome: i.outcome,
                performedAt: i.performed_at,
                relatedClientId: i.related_client_id
            })) || [];
        };

        const fetchTasks = async () => {
            const { data } = await supabase.from('tasks').select('*').eq('contact_id', clientId);
            return data?.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                relatedClientId: t.related_client_id
            })) || [];
        };

        const fetchEvents = async () => {
            const { data } = await supabase.from('events').select('*').eq('contact_id', clientId);
            return data?.map((e: any) => ({
                id: e.id,
                title: e.title,
                date: e.date,
                relatedClientId: e.related_client_id
            })) || [];
        };

        const [interactions, tasks, events] = await Promise.all([
            fetchInteractions(),
            fetchTasks(),
            fetchEvents()
        ]);

        return NextResponse.json({
            client: mappedClient,
            interactions,
            tasks,
            events
        });

    } catch (error) {
        console.error('Error fetching client details:', error);
        return NextResponse.json({ error: 'Failed to fetch client details' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    try {
        const body = await request.json();
        const clientId = params.id;

        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        // Map allowed fields
        if (body.businessName !== undefined) updateData.business_name = body.businessName;
        if (body.contactName !== undefined) updateData.contact_name = body.contactName;
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.email !== undefined) updateData.email = body.email;
        if (body.city !== undefined) updateData.city = body.city;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.businessType !== undefined) updateData.business_type = body.businessType;
        if (body.businessActivity !== undefined) updateData.business_activity = body.businessActivity;
        if (body.interestedProduct !== undefined) updateData.interested_product = body.interestedProduct;
        if (body.verbalAgreements !== undefined) updateData.verbal_agreements = body.verbalAgreements;
        if (body.personalityType !== undefined) updateData.personality_type = body.personalityType;
        if (body.communicationStyle !== undefined) updateData.communication_style = body.communicationStyle;
        if (body.keyPhrases !== undefined) updateData.key_phrases = body.keyPhrases;
        if (body.pains !== undefined) updateData.pains = body.pains;
        if (body.goals !== undefined) updateData.goals = body.goals;
        if (body.objections !== undefined) updateData.objections = body.objections;
        if (body.strengths !== undefined) updateData.strengths = body.strengths;
        if (body.weaknesses !== undefined) updateData.weaknesses = body.weaknesses;
        if (body.opportunities !== undefined) updateData.opportunities = body.opportunities;
        if (body.threats !== undefined) updateData.threats = body.threats;
        if (body.relationshipType !== undefined) updateData.relationship_type = body.relationshipType;
        if (body.quantifiedProblem !== undefined) updateData.quantified_problem = body.quantifiedProblem;
        if (body.conservativeGoal !== undefined) updateData.conservative_goal = body.conservativeGoal;
        if (body.yearsInBusiness !== undefined) updateData.years_in_business = body.yearsInBusiness;
        if (body.numberOfEmployees !== undefined) updateData.number_of_employees = body.numberOfEmployees;
        if (body.numberOfBranches !== undefined) updateData.number_of_branches = body.numberOfBranches;
        if (body.currentClientsPerMonth !== undefined) updateData.current_clients_per_month = body.currentClientsPerMonth;
        if (body.averageTicket !== undefined) updateData.average_ticket = body.averageTicket;
        if (body.knownCompetition !== undefined) updateData.known_competition = body.knownCompetition;
        if (body.highSeason !== undefined) updateData.high_season = body.highSeason;
        if (body.criticalDates !== undefined) updateData.critical_dates = body.criticalDates;
        if (body.facebookFollowers !== undefined) updateData.facebook_followers = body.facebookFollowers;
        if (body.otherAchievements !== undefined) updateData.other_achievements = body.otherAchievements;
        if (body.specificRecognitions !== undefined) updateData.specific_recognitions = body.specificRecognitions;
        if (body.notes !== undefined) updateData.notes = body.notes;
        if (body.contractValue !== undefined) updateData.contract_value = body.contractValue;
        if (body.contractStartDate !== undefined) updateData.contract_start_date = body.contractStartDate;

        const { data: updatedClient, error } = await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', clientId)
            .eq('entity_type', 'client')
            .select()
            .single();

        if (error) {
            console.error('Error updating client:', error);
            return NextResponse.json({
                error: 'Failed to update client',
                details: error.message,
                code: error.code
            }, { status: 500 });
        }

        return NextResponse.json(updatedClient);
    } catch (error: any) {
        console.error('Error updating client:', error);
        return NextResponse.json({
            error: 'Failed to update client',
            details: error.message
        }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    try {
        const id = params.id;

        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting client:', error);
            return NextResponse.json({
                error: 'Failed to delete client',
                details: error.message,
                code: error.code
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Client deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting client:', error);
        return NextResponse.json({
            error: 'Failed to delete client',
            details: error.message
        }, { status: 500 });
    }
}
