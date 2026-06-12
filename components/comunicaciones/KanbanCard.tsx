'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanCardProps {
    card: {
        id: string;
        contactName: string;
        lastMessage: string;
        lastMessageTime: Date | string;
        channelSource: string;
        unreadCount: number;
        phone?: string;
    };
    onClick: () => void;
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const safeDate = (() => {
        if (!card.lastMessageTime) return null;
        const d = new Date(card.lastMessageTime);
        return isNaN(d.getTime()) ? null : d;
    })();

    const hasUnread = card.unreadCount > 0;

    // Platform badge — platform-specific colors are INTENTIONAL and semantic (brand of each platform)
    const getPlatformBadge = (platform: string) => {
        switch (platform) {
            case 'whatsapp':
                return <span className="text-[8px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-sm font-bold">WA</span>;
            case 'telegram':
                return <span className="text-[8px] bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded-sm font-bold">TG</span>;
            case 'instagram':
                return <span className="text-[8px] bg-pink-500/10 text-pink-600 px-1.5 py-0.5 rounded-sm font-bold">IG</span>;
            default:
                return null;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`bg-[var(--brand-white)] border rounded-lg p-3 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative ${
                hasUnread
                    ? 'border-[var(--signal-urgent)] ring-1 ring-[var(--signal-urgent)]/20'
                    : 'border-[var(--brand-grey-border)] hover:border-[var(--brand-blue)]'
            }`}
        >
            {/* Unread dot — RED because it signals urgency, not branding */}
            {hasUnread && (
                <>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--signal-urgent)] rounded-full animate-ping" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--signal-urgent)] rounded-full" />
                </>
            )}

            {/* Header: Avatar + Name + Platform */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-carbon)] flex items-center justify-center text-xs font-bold text-[var(--brand-white)] shadow-sm flex-shrink-0">
                        {(card.contactName || 'UN').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate text-foreground group-hover:text-[var(--brand-blue)] transition-colors">
                            {card.contactName}
                        </span>
                        {card.phone && card.contactName !== card.phone && (
                            <span className="text-[10px] text-muted-foreground truncate">
                                {card.phone}
                            </span>
                        )}
                    </div>
                </div>
                {getPlatformBadge(card.channelSource)}
            </div>

            {/* Last Message Preview */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                {card.lastMessage || 'Sin mensajes recientes'}
            </p>

            {/* Footer: Time + Unread count */}
            <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground font-medium">
                    {safeDate
                        ? formatDistanceToNow(safeDate, { locale: es, addSuffix: true })
                        : 'Sin actividad'}
                </span>
                {hasUnread && (
                    <span className="bg-[var(--signal-urgent)] text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                        {card.unreadCount}
                    </span>
                )}
            </div>
        </div>
    );
}
