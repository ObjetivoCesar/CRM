
"use client";

import React, { useState, useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { ChatView } from './ChatView';
import { ContactDetailsPanel } from './ContactDetailsPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OpsBoard() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const fetchConversations = (showLoading = false) => {
        if (showLoading) setLoading(true);
        fetch('/api/conversations?limit=30')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Check for new messages (compare unread counts or lastActivity)
                    if (!showLoading && conversations.length > 0) {
                        data.forEach(newConv => {
                            const oldConv = conversations.find(c => c.id === newConv.id);
                            // If unread count increased, or it's a new contact at the top
                            if ((!oldConv && newConv.unreadCount > 0) || (oldConv && newConv.unreadCount > oldConv.unreadCount)) {
                                import('sonner').then(({ toast }) => {
                                    toast(`Mensaje nuevo de ${newConv.contactName}`, {
                                        description: newConv.phone,
                                        action: {
                                            label: "Ver",
                                            onClick: () => setSelectedId(newConv.id)
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

    // Polling every 10 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            fetchConversations();
        }, 10000);
        return () => clearInterval(timer);
    }, [conversations]);

    // Reset unread count when selection changes
    useEffect(() => {
        if (selectedId) {
            fetch(`/api/conversations/${selectedId}/read`, { method: 'POST' })
                .then(() => {
                    // Locally update unread count to 0
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
        <div className="h-full w-full">
            <ResizablePanelGroup direction="horizontal" className="h-full border rounded-lg overflow-hidden">
                {/* Left Panel: Inbox / Pipeline */}
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                    <div className="flex flex-col h-full bg-muted/20">
                        <div className="p-3 border-b bg-background">
                            <Tabs defaultValue="inbox" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="inbox" className="text-xs">Mesa de Entrada</TabsTrigger>
                                    <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <ConversationList
                            conversations={conversations}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                        />
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Main Panel: Chat View */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    {selectedId && selectedConversation ? (
                        <ChatView 
                            contactId={selectedId} 
                            contactName={selectedConversation.contactName}
                            phoneNumber={selectedConversation.phone}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5">
                            <div className="text-center space-y-2">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                                <p className="text-sm">Selecciona una conversación para comenzar</p>
                            </div>
                        </div>
                    )}
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Ficha Técnica 360 */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                    <ContactDetailsPanel
                        contactId={selectedId || ''}
                        contactName={selectedConversation?.contactName || ''}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
