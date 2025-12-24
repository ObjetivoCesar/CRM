import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // Map snake_case to camelCase
    const mappedTasks = allTasks?.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      assignedTo: task.assigned_to,
      relatedClientId: task.related_client_id,
      relatedLeadId: task.related_lead_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    })) || [];

    return NextResponse.json(mappedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    const body = await req.json();

    // Map camelCase to snake_case - Resilient Mapping
    const taskData = {
      title: body.title,
      description: body.description,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      due_date: body.dueDate ? new Date(body.dueDate).toISOString() : null,
      assigned_to: body.assignedTo,
      contact_id: body.contactId || body.relatedClientId || null, // ✅ Nuevo campo unificado
      related_client_id: body.relatedClientId || null, // Mantener legacy por si acaso
      related_lead_id: body.relatedLeadId || null
    };

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task: ' + error.message }, { status: 500 });
    }

    // Map back to camelCase
    const mappedTask = {
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      dueDate: newTask.due_date,
      assignedTo: newTask.assigned_to,
      relatedClientId: newTask.related_client_id,
      relatedLeadId: newTask.related_lead_id,
      createdAt: newTask.created_at,
      updatedAt: newTask.updated_at
    };

    return NextResponse.json(mappedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
