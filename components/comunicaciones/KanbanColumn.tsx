'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';

// ── Strict type — adding a color? Add it here first ──
export type KanbanColumnColor = 'blue' | 'teal' | 'green' | 'amber' | 'slate' | 'purple';

interface KanbanColumnProps {
    column: {
        id: string;
        title: string;
        color: KanbanColumnColor;
        cards: any[];
    };
    onCardClick: (cardId: string) => void;
}

// ── Per-color accent stripe + badge config ──
const COLOR_CONFIG: Record<KanbanColumnColor, { stripe: string; badge: string; badgeText: string }> = {
    blue:   { stripe: 'border-l-[var(--brand-blue)]',     badge: 'bg-[var(--brand-blue)]',     badgeText: 'text-[var(--brand-carbon)]' },
    teal:   { stripe: 'border-l-[#0d9488]',               badge: 'bg-[#0d9488]',               badgeText: 'text-white' },
    green:  { stripe: 'border-l-[var(--signal-success)]', badge: 'bg-[var(--signal-success)]', badgeText: 'text-white' },
    amber:  { stripe: 'border-l-[var(--signal-warn)]',    badge: 'bg-[var(--signal-warn)]',    badgeText: 'text-[var(--brand-carbon)]' },
    slate:  { stripe: 'border-l-[#64748b]',               badge: 'bg-[#64748b]',               badgeText: 'text-white' },
    purple: { stripe: 'border-l-[#8b5cf6]',               badge: 'bg-[#8b5cf6]',               badgeText: 'text-white' },
};

export function KanbanColumn({ column, onCardClick }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });
    const cfg = COLOR_CONFIG[column.color];

    return (
        <div
            className={`flex-shrink-0 w-80 rounded-xl border border-[var(--brand-grey-border)] flex flex-col transition-all duration-200 bg-[var(--brand-grey)] overflow-hidden ${
                isOver ? 'ring-2 ring-[var(--brand-blue)] ring-offset-2' : ''
            }`}
        >
            {/* Header — carbon bg, white text, accent left stripe */}
            <div className={`px-4 py-3 bg-[var(--brand-carbon)] border-l-4 ${cfg.stripe} flex-none`}>
                <div className="flex justify-between items-center gap-2">
                    <h3 className="font-display font-medium text-[11px] tracking-[0.15em] uppercase text-[var(--brand-white)] dark:text-white truncate">
                        {column.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${cfg.badge} ${cfg.badgeText}`}>
                        {column.cards.length}
                    </span>
                </div>
            </div>

            {/* Cards */}
            <div ref={setNodeRef} className="flex-1 p-3 min-h-[200px] overflow-hidden">
                <ScrollArea className="h-full pr-2">
                    <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {column.cards.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground text-xs italic">
                                Sin conversaciones
                            </div>
                        ) : (
                            column.cards.map(card => (
                                <KanbanCard
                                    key={card.id}
                                    card={card}
                                    onClick={() => onCardClick(card.id)}
                                />
                            ))
                        )}
                    </SortableContext>
                </ScrollArea>
            </div>
        </div>
    );
}
