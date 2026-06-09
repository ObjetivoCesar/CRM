
"use client";

import React, { useState, useEffect } from 'react';
import { ConversationList } from '@/components/ops/ConversationList';
import { ChatView } from '@/components/ops/ChatView';
import { ContactDetailsPanel } from '@/components/ops/ContactDetailsPanel';
import { KanbanBoard } from './KanbanBoard';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Loader2, KanbanSquare, List as ListIcon, X, Filter, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CommunicationsHub() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [showKanbanChat, setShowKanbanChat] = useState(false);
    const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'instagram'>('all');
    const [showInbox, setShowInbox] = useState(true);

    const fetchConversations = (showLoading = false) => {
        if (showLoading) setLoading(true);
        fetch('/api/conversations?limit=50')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Check for new messages logic (preserved from OpsBoard)
                    if (!showLoading && conversations.length > 0) {
                        data.forEach(newConv => {
                            const oldConv = conversations.find(c => c.id === newConv.id);
                            if ((!oldConv && newConv.unreadCount > 0) || (oldConv && newConv.unreadCount > oldConv.unreadCount)) {
                                import('sonner').then(({ toast }) => {
                                    toast(`Mensaje nuevo de ${newConv.contactName}`, {
                                        description: newConv.phone,
                                        action: {
                                            label: "Ver",
                                            onClick: () => {
                                                setSelectedId(newConv.id);
                                                if (viewMode === 'kanban') {
                                                    setShowKanbanChat(true);
                                                }
                                            }
                                        }
                                    });
                                });
                            }
                        });
                    }
                    setConversations(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load conversations", err);
                setLoading(false);
            });
    };

    // Initial load
    useEffect(() => {
        fetchConversations(true);
    }, []);

    // Polling every 5 seconds (more aggressive than Ops for better feel)
    useEffect(() => {
        const timer = setInterval(() => {
            fetchConversations();
        }, 5000);
        return () => clearInterval(timer);
    }, [conversations]);

    // Reset unread count
    useEffect(() => {
        if (selectedId) {
            fetch(`/api/conversations/${selectedId}/read`, { method: 'POST' })
                .then(() => {
                    setConversations(prev => prev.map(c =>
                        c.id === selectedId ? { ...c, unreadCount: 0 } : c
                    ));
                })
                .catch(e => console.error("Error resetting unread count:", e));
        }
    }, [selectedId]);

    const selectedConversation = conversations.find(c => c.id === selectedId);

    if (loading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex-none flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    Comunicaciones Unificadas
                    <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                        {conversations.length} chats
                    </span>
                </h2>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-2">
                                <Filter className="h-4 w-4" />
                                {channelFilter === 'all' ? 'Todos los canales' : channelFilter === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setChannelFilter('all')}>
                                Todos los canales
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChannelFilter('whatsapp')}>
                                Solo WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChannelFilter('instagram')}>
                                Solo Instagram
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            setViewMode('list');
                            setShowKanbanChat(false);
                        }}
                    >
                        <ListIcon className="h-4 w-4 mr-2" />
                        Lista
                    </Button>
                    <Button
                        variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('kanban')}
                    >
                        <KanbanSquare className="h-4 w-4 mr-2" />
                        Kanban
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative">
                {viewMode === 'kanban' ? (
                    // Kanban View with Optional Side Chat
                    <div className="h-full flex relative">
                        <div className={`transition-all duration-300 ${showKanbanChat ? 'flex-1' : 'w-full'}`}>
                        <KanbanBoard 
                            conversations={conversations.filter(c => channelFilter === 'all' || c.channelSource === channelFilter)}
                            onCardClick={(contactId) => {
                                setSelectedId(contactId);
                                setShowKanbanChat(true);
                            }} 
                        />
                    </div>

                    {/* Side Chat Panel */}
                    {showKanbanChat && selectedId && selectedConversation && (
                        <div className="w-[500px] border-l bg-background flex flex-col shadow-2xl">
                            {/* Chat Header */}
                            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                        {(selectedConversation.contactName || 'UN').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">{selectedConversation.contactName}</h3>
                                        <p className="text-xs text-muted-foreground">Chat rápido desde Kanban</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowKanbanChat(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-hidden">
                                <ChatView
                                    key={`kanban-chat-${selectedId}`}
                                    contactId={selectedId}
                                    contactName={selectedConversation.contactName}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // 3-Panel List View — no horizontal scroll, collapsible inbox
                <div className="h-full flex overflow-hidden">
                    {/* Collapsible Left Panel: Inbox */}
                    <div className={`flex-none border-r bg-muted/20 transition-all duration-300 overflow-hidden flex flex-col ${showInbox ? 'w-72' : 'w-0'}`}>
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <ConversationList
                                conversations={conversations.filter(c => channelFilter === 'all' || c.channelSource === channelFilter)}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        </div>
                    </div>

                    {/* Toggle Inbox Button */}
                    <button
                        onClick={() => setShowInbox(v => !v)}
                        className="flex-none w-5 bg-muted/30 hover:bg-muted/60 border-r flex items-center justify-center transition-colors group"
                        title={showInbox ? 'Ocultar bandeja' : 'Mostrar bandeja'}
                    >
                        {showInbox
                            ? <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                            : <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />}
                    </button>

                    {/* Main Panel: Chat View */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                        {selectedId && selectedConversation ? (
                            <ChatView
                                key={`list-chat-${selectedId}`}
                                contactId={selectedId}
                                contactName={selectedConversation.contactName}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5">
                                <div className="text-center space-y-2">
                                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Loader2 className="h-8 w-8 text-primary animate-pulse" />
                                    </div>
                                    <h3 className="text-lg font-medium">Selecciona una conversación</h3>
                                    <p className="text-sm max-w-sm mx-auto">
                                        Gestiona todas tus comunicaciones desde un solo lugar.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Ficha Técnica 360 — only shows when a chat is selected */}
                    {selectedId && selectedConversation && (
                        <div className="flex-none w-72 border-l overflow-hidden">
                            <ContactDetailsPanel
                                contactId={selectedId || ''}
                                contactName={selectedConversation?.contactName || ''}
                            />
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
}
