'use client';

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import type { KanbanColumnColor } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Card {
    id: string;
    contactId?: string;  // UUID real del contacto en DB
    contactName: string;
    lastMessage: string;
    lastMessageTime: Date | string;
    channelSource: string;
    unreadCount: number;
    phone?: string;
}

interface Column {
    id: string;
    title: string;
    color: KanbanColumnColor;
    cards: Card[];
}

interface KanbanBoardProps {
    conversations: Card[];
    onCardClick: (contactId: string) => void;
}

export function KanbanBoard({ conversations, onCardClick }: KanbanBoardProps) {
    const [columns, setColumns] = useState<Column[]>([]);
    const [activeCard, setActiveCard] = useState<Card | null>(null);
    const [pendingMove, setPendingMove] = useState<{
        card: Card;
        sourceId: string;
        destId: string;
    } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        })
    );

    // Categorize data whenever conversations change.
    // ⚠️ Regla de oro: cada tarjeta pertenece a UNA sola columna.
    // La categorización refleja exactamente lo que el PATCH guarda en DB:
    //   entrada      → botMode='active'  + (status='sin_contacto' o no status o unreadCount > 0)
    //   informador   → botMode='active'  + status='primer_contacto'
    //   closer       → botMode='active'  + status='segundo_contacto'
    //   soporte      → botMode='active'  + status='soporte'
    //   intervencion → botMode='paused'  + status='tercer_contacto'
    //   finalizados  → botMode='disabled' + status='convertido'
    useEffect(() => {
        // Map conversations → Card shape
        const toCard = (c: any): Card => ({
            id: c.id,
            contactId: c.contactId || c.id,
            contactName: c.contactName || c.phone || 'Desconocido',
            lastMessage: c.lastMessage || '',
            lastMessageTime: c.lastActivityAt || c.lastMessageTime || null,
            channelSource: c.channelSource || 'whatsapp',
            unreadCount: c.unreadCount || 0,
            phone: c.phone,
        });

        const columnsData = [
            {
                id: 'entrada',
                title: 'Entrada / Clasificador',
                color: 'blue',
                cards: conversations
                    .filter((c: any) =>
                        c.botMode === 'active' &&
                        (c.status === 'sin_contacto' || !c.status)
                    )
                    .map(toCard),
            },
            {
                id: 'informador',
                title: 'Informador',
                color: 'teal',
                cards: conversations
                    .filter((c: any) =>
                        c.botMode === 'active' &&
                        c.status === 'primer_contacto'
                    )
                    .map(toCard),
            },
            {
                id: 'closer',
                title: 'Closer',
                color: 'green',
                cards: conversations
                    .filter((c: any) =>
                        c.botMode === 'active' &&
                        c.status === 'segundo_contacto'
                    )
                    .map(toCard),
            },
            {
                id: 'soporte',
                title: 'Soporte',
                color: 'purple',
                cards: conversations
                    .filter((c: any) =>
                        c.botMode === 'active' &&
                        c.status === 'soporte'
                    )
                    .map(toCard),
            },
            {
                id: 'intervencion',
                title: 'Intervención César',
                color: 'amber',
                cards: conversations
                    .filter((c: any) =>
                        c.botMode === 'paused' ||
                        c.status === 'tercer_contacto'
                    )
                    .map(toCard),
            },
            {
                id: 'finalizados',
                title: 'Finalizados',
                color: 'slate',
                cards: conversations
                    .filter((c: any) =>
                        c.botMode === 'disabled' ||
                        c.status === 'convertido'
                    )
                    .map(toCard),
            },
        ];

        setColumns(columnsData as any);
    }, [conversations]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const card = columns
            .flatMap(col => col.cards)
            .find(c => c.id === active.id);
        setActiveCard(card || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);

        if (!over) return;

        const activeCardId = active.id as string;
        const overColumnId = over.id as string;

        // Find source and destination columns
        const sourceColumn = columns.find(col =>
            col.cards.some((card: Card) => card.id === activeCardId)
        );
        const destColumn = columns.find(col => col.id === overColumnId);

        if (!sourceColumn || !destColumn) return;
        if (sourceColumn.id === destColumn.id) return; // Same column, no change

        // Instead of immediate update, open the confirmation dialog
        const movedCard = sourceColumn.cards.find(c => c.id === activeCardId);
        if (!movedCard) return;

        setPendingMove({
            card: movedCard,
            sourceId: sourceColumn.id,
            destId: destColumn.id
        });
    };

    const confirmMove = async () => {
        if (!pendingMove) return;

        const { card, sourceId, destId } = pendingMove;
        
        // Find columns again in case they changed
        const destColumn = columns.find(c => c.id === destId);
        if (!destColumn) {
            setPendingMove(null);
            return;
        }

        // Optimistic UI update
        const newColumns = columns.map(col => {
            if (col.id === sourceId) {
                return {
                    ...col,
                    cards: col.cards.filter(c => c.id !== card.id),
                };
            }
            if (col.id === destId) {
                return {
                    ...col,
                    cards: [...col.cards, card],
                };
            }
            return col;
        });

        setColumns(newColumns);
        setPendingMove(null);

        // Update backend — usar contactId (UUID) no card.id (chatKey/teléfono)
        try {
            const res = await fetch('/api/conversations/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactId: card.contactId || card.id,
                    column: destId,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                console.error('Kanban PATCH error:', err);
            }
        } catch (error) {
            console.error('Error updating kanban:', error);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* Outer: fills all vertical space given by CommunicationsHub, clips overflow */}
            <div className="relative h-full overflow-hidden kanban-fade-right">
              {/* Inner: horizontal scroll stays INSIDE this box — no page-level scrollbar */}
              <div className="flex gap-4 h-full overflow-x-auto overflow-y-hidden no-scrollbar p-4 bg-[var(--brand-grey)]/30">
                {columns.map(column => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        onCardClick={onCardClick}
                    />
                ))}
              </div>
            </div>

            <DragOverlay>
                {activeCard ? (
                    <div className="rotate-3 scale-105 opacity-90">
                        <KanbanCard card={activeCard} onClick={() => { }} />
                    </div>
                ) : null}
            </DragOverlay>

            <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar cambio de estado?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás a punto de mover a <b>{pendingMove?.card.contactName}</b> a la columna de <b>{columns.find(c => c.id === pendingMove?.destId)?.title}</b>. ¿Deseas continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingMove(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmMove}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DndContext>
    );
}
