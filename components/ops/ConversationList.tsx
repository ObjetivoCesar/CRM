
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Phone } from 'lucide-react'; // Icons for WA/Telegram

interface Conversation {
    id: string;
    contactName: string;
    phone: string;
    lastActivityAt?: string;
    channelSource?: 'whatsapp' | 'telegram' | 'instagram';
    unreadCount?: number;
    status?: string; // Added for pipeline view
}

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (id: string) => void;
    viewMode?: 'inbox' | 'pipeline';
}

export function ConversationList({ conversations, selectedId, onSelect, viewMode = 'inbox' }: ConversationListProps) {
    if (viewMode === 'pipeline') {
        // Simple grouping by status
        const statuses = ['sin_contacto', 'primer_contacto', 'seguimiento', 'negocicion', 'cerrado'];
        // You might want to type this properly or fetch status list

        return (
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 p-2">
                    {statuses.map(status => {
                        const items = conversations.filter(c => c.status === status);
                        if (items.length === 0) return null;

                        return (
                            <div key={status} className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">{status.replace('_', ' ')}</h4>
                                {items.map(conv => (
                                    <ConversationItem key={conv.id} conv={conv} selectedId={selectedId} onSelect={onSelect} />
                                ))}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 p-2">
                {conversations.map((conv) => (
                    <ConversationItem key={conv.id} conv={conv} selectedId={selectedId} onSelect={onSelect} />
                ))}
            </div>
        </ScrollArea>
    );
}

function ConversationItem({ conv, selectedId, onSelect }: { conv: Conversation, selectedId?: string, onSelect: (id: string) => void }) {
    const isSelected = selectedId === conv.id;

    return (
        <button
            onClick={() => onSelect(conv.id)}
            className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 
                ${isSelected
                    ? "bg-[var(--brand-blue-subtle)] border-[var(--brand-blue)] shadow-sm"
                    : "bg-background hover:bg-muted/50 border-muted hover:border-muted-foreground/30"
                }`}
        >
            <div className="relative">
                <Avatar className={`h-10 w-10 border ${isSelected ? "border-[var(--brand-blue)]" : "border-muted"}`}>
                    <AvatarFallback className={isSelected ? "bg-[var(--brand-carbon)] text-[var(--brand-white)]" : "bg-muted"}>
                        {conv.contactName?.substring(0, 2).toUpperCase() || '?'}
                    </AvatarFallback>
                </Avatar>
                {conv.unreadCount && conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-background">
                        {conv.unreadCount > 9 ? '+' : conv.unreadCount}
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold truncate ${isSelected ? "text-[var(--brand-blue)]" : "text-foreground"}`}>
                        {conv.contactName}
                    </span>
                    {conv.lastActivityAt && !isNaN(new Date(conv.lastActivityAt).getTime()) && (
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                            {format(new Date(conv.lastActivityAt), 'HH:mm', { locale: es })}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between mt-1">
                    <span className="truncate text-[10px] text-muted-foreground font-medium">
                        {conv.phone || 'Sin número'}
                    </span>
                    <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100">
                        {conv.channelSource === 'telegram' ? (
                            <div className="p-1 bg-blue-500/10 rounded-md">
                                <MessageSquare className="h-3 w-3 text-blue-400" />
                            </div>
                        ) : conv.channelSource === 'instagram' ? (
                            <div className="p-1 bg-pink-500/10 rounded-md">
                                <span className="text-[10px]">📸</span>
                            </div>
                        ) : (
                            <div className="p-1 bg-green-500/10 rounded-md">
                                <Phone className="h-3 w-3 text-green-500" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

