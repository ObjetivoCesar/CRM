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

    // Safe date parsing — avoids RangeError on null / invalid values
    const safeDate = (() => {
        if (!card.lastMessageTime) return null;
        const d = new Date(card.lastMessageTime);
        return isNaN(d.getTime()) ? null : d;
    })();

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
            className={`bg-white border rounded-lg p-3 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300 transition-all group relative ${card.unreadCount > 0 ? 'border-blue-400 shadow-blue-100 shadow-md ring-2 ring-blue-200 animate-pulse' : 'border-slate-200'
                }`}
        >
            {/* Unread Indicator Dot */}
            {card.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            )}
            {card.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}

            {/* Header: Avatar + Name + Platform */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                        {(card.contactName || 'UN').substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm truncate text-slate-800 group-hover:text-blue-600 transition-colors">
                        {card.contactName}
                    </span>
                </div>
                {getPlatformBadge(card.channelSource)}
            </div>

            {/* Last Message Preview */}
            <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                {card.lastMessage || 'Sin mensajes recientes'}
            </p>

            {/* Footer: Time + Unread */}
            <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-medium">
                    {safeDate
                        ? formatDistanceToNow(safeDate, { locale: es, addSuffix: true })
                        : 'Sin actividad'}
                </span>
                {card.unreadCount > 0 && (
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm animate-bounce">
                        {card.unreadCount}
                    </span>
                )}
            </div>
        </div>
    );
}
