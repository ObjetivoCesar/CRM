import { SupabaseClient } from '@supabase/supabase-js';

export interface ClientContext {
    profile: any;
    interactions: any[];
    tasks: any[];
    finances: {
        totalIncome: number;
        totalExpense: number;
        pendingAmount: number;
        recentTransactions: any[];
    };
}

export async function getClientContext(supabase: SupabaseClient, clientId: string): Promise<ClientContext> {
    console.log(`🧠 [Cortex] Fetching context for ID: ${clientId}`);

    // 1. Fetch Contact Profile (Try as Contact first)
    // We remove the strict entity_type check to allow reading during conversion transition
    const { data: profile, error: profileError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', clientId)
        .single();

    if (profileError) {
        console.warn(`⚠️ [Cortex] Profile not found in contacts: ${profileError.message}`);
    }

    const discoveryLeadId = profile?.discovery_lead_id;
    console.log(`🔗 [Cortex] Profile: ${profile?.business_name || 'N/A'}, Discovery Link: ${discoveryLeadId || 'None'}`);

    // 2. Fetch Interactions (Unificado: Pasado en Discovery + Presente en Contacts)
    // Usamos .or() para traer toda la película del cliente
    let interactionQuery = supabase.from('interactions').select('*');

    // Construir filtro OR dinámico
    const orFilters = [`contact_id.eq.${clientId}`];
    if (discoveryLeadId) {
        orFilters.push(`discovery_lead_id.eq.${discoveryLeadId}`);
    }

    const { data: interactions, error: intError } = await interactionQuery
        .or(orFilters.join(','))
        .order('performed_at', { ascending: false })
        .limit(15);

    if (intError) console.error(`❌ [Cortex] Error fetching interactions: ${intError.message}`);

    // 3. Fetch Pending Tasks (Last 5)
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .or(`contact_id.eq.${clientId}${discoveryLeadId ? `,discovery_lead_id.eq.${discoveryLeadId}` : ''}`)
        .eq('status', 'todo')
        .limit(5);

    // 4. Fetch Financial Data (Transactions)
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

    console.log(`📊 [Cortex] Data retrieved: ${interactions?.length || 0} interactions, ${tasks?.length || 0} tasks`);

    const totalIncome = transactions?.filter(t => t.type === 'INCOME' && t.status === 'PAID')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const totalExpense = transactions?.filter(t => t.type === 'EXPENSE' && t.status === 'PAID')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const pendingAmount = transactions?.filter(t => t.status === 'PENDING' || t.status === 'OVERDUE')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    return {
        profile: profile || {},
        interactions: interactions || [],
        tasks: tasks || [],
        finances: {
            totalIncome,
            totalExpense,
            pendingAmount,
            recentTransactions: transactions?.slice(0, 5) || []
        }
    };
}

export function formatContextForAI(context: ClientContext): string {
    const { profile, interactions, tasks, finances } = context;

    return `
DATOS DEL CLIENTE:
- Negocio: ${profile?.business_name || 'N/A'}
- Contacto: ${profile?.contact_name || 'N/A'}
- Tipo: ${profile?.business_type || 'N/A'}
- Dolores: ${profile?.pains || 'No registrados'}
- Metas: ${profile?.goals || 'No registradas'}
- Objeciones: ${profile?.objections || 'Ninguna registrada'}

ESTADO FINANCIERO:
- Ingresos Totales Cobrados: $${finances.totalIncome}
- Gastos Totales: $${finances.totalExpense}
- Saldo Pendiente de Cobro: $${finances.pendingAmount}
- Últimas Transacciones: ${finances.recentTransactions.map(t => `${t.date}: ${t.type} $${t.amount} (${t.description})`).join('; ') || 'Ninguna'}

HISTORIAL RECIENTE (Últimas 10 interacciones):
${interactions.map(i => `- ${i.performed_at} [${i.type}]: ${i.content} (Resultado: ${i.outcome})`).join('\n') || 'Sin interacciones'}

TAREAS PENDIENTES:
${tasks.map(t => `- ${t.title}: ${t.description || 'Sin descripción'}`).join('\n') || 'Sin tareas pendientes'}
    `.trim();
}
