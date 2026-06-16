import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Loader2, Mic, Image, FileIcon, Square, User, Bot, MessageSquareOff, Share2, Download, CheckCheck, Pencil, X, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClientLinkDialog } from './ClientLinkDialog';
import { CreateContactDialog } from './CreateContactDialog';
import { ExportChatDialog } from './ExportChatDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    messageTimestamp: string;
    platform: string;
    metadata?: any;
}

interface ChatViewProps {
    contactId: string;
    contactName: string;
    phoneNumber?: string;
}

export function ChatView({ contactId, contactName, phoneNumber }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [availableChannels, setAvailableChannels] = useState<{ platform: string; identifier: string }[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('whatsapp');
    const [botMode, setBotMode] = useState<'active' | 'paused' | 'disabled' | 'co-pilot'>('active');
    const [suggestion, setSuggestion] = useState<{ id: string; suggestedResponse: string } | null>(null);
    const [correctionReason, setCorrectionReason] = useState<'context' | 'tone' | 'wrong_info' | null>(null);
    const [isEditingDraft, setIsEditingDraft] = useState(false);
    const [showEmojiBar, setShowEmojiBar] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    // Fetch History & Polling
    useEffect(() => {
        if (!contactId) return;

        const fetchHistory = (isQuiet = false) => {
            if (!isQuiet) setLoading(true);
            fetch(`/api/conversations/${contactId}/history`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setMessages(prev => {
                            // Keep optimistic messages that aren't in the server response yet
                            const serverIds = new Set(data.map(m => m.id));
                            const optimisticMessages = prev.filter(m => m.id.startsWith('temp_') && !serverIds.has(m.id));

                            // Merge and sort
                            const combined = [...data, ...optimisticMessages];
                            return combined.sort((a, b) =>
                                new Date(a.messageTimestamp).getTime() - new Date(b.messageTimestamp).getTime()
                            );
                        });
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load history", err);
                    setLoading(false);
                });
        };

        fetchHistory();

        // Fetch bot mode from the correct unified endpoint
        const fetchBotMode = () => {
            fetch(`/api/whatsapp/chats/${contactId}/details?type=contact`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) setBotMode(data.data.botMode || 'active');
                })
                .catch(() => {
                    fetch(`/api/whatsapp/chats/${contactId}/details?type=discovery`)
                        .then(res => res.json())
                        .then(data => { if (data.success) setBotMode(data.data.botMode || 'active'); })
                        .catch(() => {}); // ghost contact, keep default
                });
        };
        fetchBotMode();

        fetch(`/api/conversations/${contactId}/channels`)
            .then(res => res.json())
            .then(data => {
                setAvailableChannels(data);
                // If the primary channel is available, select it, otherwise default to first or whatsapp
                if (data.length > 0) {
                    const primary = data.find((c: any) => c.isPrimary);
                    setSelectedPlatform(primary?.platform || data[0].platform);
                } else {
                    setSelectedPlatform('whatsapp');
                }
            })
            .catch(err => console.error("Failed to load channels", err));

        // Polling every 5 seconds for real-time sync (history + botMode + co-pilot suggestion)
        const timer = setInterval(() => {
            fetchHistory(true);
            fetchBotMode(); // Keep badge in sync with ContactDetailsPanel switch

            // Poll for co-pilot suggestions
            fetch(`/api/conversations/${contactId}/suggestion`)
                .then(r => r.json())
                .then(data => {
                    if (data.suggestion) {
                        setSuggestion(data.suggestion);
                    } else {
                        setSuggestion(null);
                    }
                })
                .catch(() => {});
        }, 5000);

        return () => clearInterval(timer);
    }, [contactId]);

    // Lazy load media URLs (Optimized)
    const processedMediaIds = useRef(new Set<string>());
    useEffect(() => {
        messages.forEach(async (msg) => {
            const mediaId = msg.metadata?.media?.id;
            if (mediaId && !msg.metadata.media.url && !processedMediaIds.current.has(mediaId)) {
                processedMediaIds.current.add(mediaId); // Mark as in-flight
                try {
                    const res = await fetch(`/api/conversations/media/${mediaId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setMessages(prev => prev.map(m =>
                            m.metadata?.media?.id === mediaId ? {
                                ...m,
                                metadata: {
                                    ...m.metadata,
                                    media: { ...m.metadata!.media!, url: data.url }
                                }
                            } : m
                        ));
                    } else {
                        processedMediaIds.current.delete(mediaId); // Retry next time if failed
                    }
                } catch (err) {
                    console.error('Failed to lazy load media:', mediaId, err);
                    processedMediaIds.current.delete(mediaId);
                }
            }
        });
    }, [messages]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const uploadFile = async (file: File, type: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const res = await fetch('/api/whatsapp/media/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Upload failed');
        return await res.json();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const mimeType = isSafari ? 'audio/mp4' : 'audio/webm;codecs=opus';

            mediaRecorder.current = new MediaRecorder(stream, { mimeType });
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = async () => {
                const finalBlob = new Blob(audioChunks.current, { type: mimeType });
                console.log('🎤 Audio recording stopped. Blob size:', finalBlob.size);
                const ext = isSafari ? 'm4a' : 'webm';
                const file = new File([finalBlob], `voice_${Date.now()}.${ext}`, { type: mimeType });

                try {
                    setSending(true);
                    console.log('📤 Uploading audio file:', file.name);
                    const uploadResult = await uploadFile(file, 'audio');
                    console.log('✅ Audio upload success. Media ID:', uploadResult.mediaId);
                    await handleSend('', {
                        type: 'voice', // Switch to 'voice' for interactive player in WhatsApp
                        id: uploadResult.mediaId
                    });
                } catch (err) {
                    console.error("❌ Failed to send audio", err);
                } finally {
                    setSending(false);
                }
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let type: 'image' | 'document' | 'video' | 'audio' = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.name.toLowerCase().endsWith('.vcf')) type = 'document';

        try {
            setSending(true);
            const uploadResult = await uploadFile(file, type);
            await handleSend(file.name, {
                type: type,
                id: uploadResult.mediaId,
                caption: file.name
            });
        } catch (err) {
            console.error("File upload error", err);
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async (textOverride?: string, media?: any) => {
        const messageContent = textOverride !== undefined ? textOverride : input;
        if (!messageContent.trim() && !media) return;
        setSending(true);

        const tempId = `temp_${Date.now()}`;
        // Optimistic UI
        const optimisticMsg: Message = {
            id: tempId,
            role: 'assistant',
            content: messageContent,
            messageTimestamp: new Date().toISOString(),
            platform: selectedPlatform,
            metadata: media ? { ...media, isOptimistic: true } : undefined
        };
        setMessages(prev => [...prev, optimisticMsg]);
        if (textOverride === undefined) setInput('');

        try {
            const res = await fetch(`/api/conversations/${contactId}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: optimisticMsg.content || (media ? `[${media.type}]` : ''),
                    metadata: { media, platform: selectedPlatform }
                })
            });

            if (!res.ok) throw new Error('Send failed');

            // Replace optimistic message with real one from backend
            const result = await res.json();
            if (result.messageId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId ? { ...msg, id: result.messageId } : msg
                ));
            }
        } catch (error) {
            console.error("Send error", error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    // Helper to detect if name is just a phone number (Ghost Contact)
    const isUnknownNumber = contactName.replace(/\D/g, '').length >= 7 && !contactName.match(/[a-zA-Z]/);

    return (
        <div className="flex flex-col h-full bg-background border rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-muted/30 p-4 border-b flex justify-between items-center backdrop-blur-sm">
                <div className="flex flex-col">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                        {contactName}
                        {isUnknownNumber && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                Desconocido
                            </span>
                        )}
                        {phoneNumber && contactName !== phoneNumber && (
                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                {phoneNumber}
                            </span>
                        )}
                    </h3>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                        {isUnknownNumber ? 'Número no guardado' : 'Unified Channel View'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                        botMode === 'active'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                            : botMode === 'co-pilot'
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-600'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                        {botMode === 'active' && <Bot className="w-3.5 h-3.5" />}
                        {botMode === 'co-pilot' && <Sparkles className="w-3.5 h-3.5" />}
                        {(botMode === 'paused' || botMode === 'disabled') && <MessageSquareOff className="w-3.5 h-3.5" />}
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                            {botMode === 'active' ? 'Donna Activa' : botMode === 'co-pilot' ? 'Co-Pilot' : 'Modo Manual'}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <ExportChatDialog contactId={contactId} messages={messages} />
                        {isUnknownNumber && (
                            <CreateContactDialog contactId={contactId} phoneNumber={contactName} />
                        )}
                        <ClientLinkDialog contactId={contactId} />
                    </div>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-muted/5">
                <div className="flex flex-col gap-5">
                    {Array.isArray(messages) && messages.map((msg) => {
                        const isAssistant = msg.role === 'assistant';
                        const isSystem = msg.role === 'system';

                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center my-3">
                                    <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wider">
                                        {msg.content}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isAssistant ? 'justify-end' : 'justify-start'}`}>
                                {!isAssistant && (
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-300 shadow-sm transition-transform hover:scale-110">
                                            {isUnknownNumber ? (
                                                <User className="w-4 h-4" />
                                            ) : (
                                                contactName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className={`max-w-[80%] rounded-2xl p-4 transition-all duration-200 ${isAssistant
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/20'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                                    }`}>
                                    {/* Media Rendering */}
                                    {msg.metadata?.media && (
                                        <div className="mb-3">
                                            {msg.metadata.media.type === 'image' && (
                                                <div className="rounded-xl overflow-hidden border border-white/20 bg-black/5 shadow-inner">
                                                    {msg.metadata.media.url ? (
                                                        <img src={msg.metadata.media.url} alt="WhatsApp" className="max-w-full h-auto hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="p-10 flex flex-col items-center gap-3 opacity-60">
                                                            <Image className="w-10 h-10" />
                                                            <span className="text-xs font-medium">Imagen enviada</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {msg.metadata.media.type === 'audio' && (
                                                <div className={`flex items-center gap-3 p-3 rounded-xl ${isAssistant ? 'bg-blue-700/50' : 'bg-slate-50'}`}>
                                                    <div className={`p-2 rounded-full ${isAssistant ? 'bg-blue-400/20' : 'bg-blue-500/10'}`}>
                                                        <Mic className={`w-4 h-4 ${isAssistant ? 'text-blue-100' : 'text-blue-600'}`} />
                                                    </div>
                                                    {msg.metadata.media.url ? (
                                                        <audio controls src={msg.metadata.media.url} className="h-8 max-w-[220px] filter saturate-50" />
                                                    ) : (
                                                        <span className="text-xs italic font-medium opacity-80 uppercase tracking-tight">
                                                            {isAssistant ? 'Audio enviado' : 'Audio recibido'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {(msg.metadata.media.type === 'document' || msg.metadata.media.type === 'video') && (
                                                <div className={`flex items-center gap-3 p-3 rounded-xl border ${isAssistant ? 'bg-blue-700/50 border-blue-400/20' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="p-2 bg-slate-500/10 rounded-lg">
                                                        <FileIcon className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                    <span className="text-xs font-bold truncate opacity-90">{msg.metadata.media.caption || 'Archivo adjunto'}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {msg.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>}

                                    <div className={`text-[9px] mt-2 flex items-center justify-end gap-1 font-bold uppercase tracking-widest ${isAssistant ? 'text-blue-100/70' : 'text-slate-400'}`}>
                                        {msg.messageTimestamp && !isNaN(new Date(msg.messageTimestamp).getTime())
                                            ? format(new Date(msg.messageTimestamp), 'HH:mm', { locale: es })
                                            : ''}
                                        <span className="opacity-50">•</span>
                                        <div className="flex items-center gap-1">
                                            {msg.platform === 'whatsapp' && <span className="text-[8px] bg-green-500/10 text-green-600 px-1 rounded-sm">WA</span>}
                                            {msg.platform === 'telegram' && <span className="text-[8px] bg-sky-500/10 text-sky-600 px-1 rounded-sm">TG</span>}
                                            {msg.platform === 'instagram' && <span className="text-[8px] bg-pink-500/10 text-pink-600 px-1 rounded-sm">IG</span>}
                                            {msg.platform}
                                        </div>
                                    </div>
                                </div>

                                {isAssistant && (
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white border border-blue-500 shadow-md transition-transform hover:scale-110">
                                            DO
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Footer / Input */}
            <div className="p-4 border-t bg-background flex flex-col gap-3 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                {/* Platform Selector */}
                {availableChannels.length > 1 && (
                    <div className="flex gap-2 mb-1 px-1">
                        {availableChannels.map((ch) => (
                            <button
                                key={ch.platform}
                                onClick={() => setSelectedPlatform(ch.platform)}
                                className={`text-[9px] font-bold px-3 py-1 rounded-full border transition-all ${selectedPlatform === ch.platform
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                    : 'bg-muted/50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    } uppercase tracking-widest`}
                            >
                                {ch.platform}
                            </button>
                        ))}
                    </div>
                )}
                {isRecording && (
                    <div className="flex items-center justify-between bg-red-500/5 p-3 rounded-xl border border-red-500/10 animate-pulse">
                        <div className="flex items-center gap-3 text-red-600 text-xs font-bold uppercase tracking-wider">
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                            Grabando Nota de Voz...
                        </div>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest rounded-full"
                            onClick={stopRecording}
                        >
                            Detener y Enviar
                        </Button>
                    </div>
                )}

                {/* Co-Pilot Suggestion Box */}
                {botMode === 'co-pilot' && suggestion && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in-0 slide-in-from-bottom-2">
                        <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Donna sugiere:</p>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{suggestion.suggestedResponse}</p>
                            </div>
                        </div>

                        {/* Correction reason selector — only shown when editing */}
                        {isEditingDraft && (
                            <div className="flex gap-1.5 flex-wrap ml-6">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider w-full">¿Por qué la corriges?</p>
                                {([['context', 'Contexto especial'], ['tone', 'Tono'], ['wrong_info', 'Dato incorrecto']] as const).map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setCorrectionReason(val)}
                                        className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                            correctionReason === val
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'
                                        }`}
                                    >{label}</button>
                                ))}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-6">
                            {/* APPROVE */}
                            <button
                                onClick={async () => {
                                    await fetch(`/api/conversations/${contactId}/training-feedback`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            suggestionId: suggestion.id,
                                            originalAiResponse: suggestion.suggestedResponse,
                                            action: 'approved'
                                        })
                                    });
                                    handleSend(suggestion.suggestedResponse);
                                    setSuggestion(null);
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all active:scale-95"
                            >
                                <CheckCheck className="w-3 h-3" /> Aprobar y Enviar
                            </button>

                            {/* EDIT */}
                            <button
                                onClick={() => {
                                    if (!isEditingDraft) {
                                        setInput(suggestion.suggestedResponse);
                                        setIsEditingDraft(true);
                                    } else {
                                        // Confirm the edit and log it
                                        fetch(`/api/conversations/${contactId}/training-feedback`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                suggestionId: suggestion.id,
                                                originalAiResponse: suggestion.suggestedResponse,
                                                action: 'edited',
                                                humanCorrectedResponse: input,
                                                correctionReason
                                            })
                                        });
                                        setSuggestion(null);
                                        setIsEditingDraft(false);
                                        setCorrectionReason(null);
                                        // handleSend() will fire from user pressing Enter or Send
                                    }
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all active:scale-95"
                            >
                                <Pencil className="w-3 h-3" /> {isEditingDraft ? 'Listo, enviar mi versión' : 'Editar'}
                            </button>

                            {/* DISCARD */}
                            <button
                                onClick={async () => {
                                    await fetch(`/api/conversations/${contactId}/suggestion`, {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ suggestionId: suggestion.id, reason: 'discarded' })
                                    });
                                    setSuggestion(null);
                                    setIsEditingDraft(false);
                                    setCorrectionReason(null);
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 hover:border-red-200 transition-all active:scale-95 ml-auto"
                            >
                                <X className="w-3 h-3" /> Descartar
                            </button>
                        </div>
                    </div>
                )}

                {/* Emoji Quick-Send Bar */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowEmojiBar(v => !v)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            showEmojiBar ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-muted/50 border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                        title="Emojis de reactivación"
                    >😊</button>
                    {showEmojiBar && (
                        <div className="flex gap-1 animate-in fade-in-0 slide-in-from-left-2">
                            {['👋', '🔥', '❤️', '😊', '👍', '💪', '🙌', '🎯', '💡', '✨'].map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleSend(emoji)}
                                    disabled={sending}
                                    className="text-lg hover:scale-125 active:scale-90 transition-transform duration-150 disabled:opacity-50 px-1"
                                    title={`Enviar ${emoji}`}
                                >{emoji}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={onFileSelect}
                        accept="image/*,audio/*,video/*,application/pdf"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group active:scale-95"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || isRecording}
                    >
                        <Paperclip className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                    </Button>

                    <div className="relative flex-1 group">
                        <Input
                            placeholder={isRecording ? "Silencio por favor, grabando..." : "Escribe un mensaje..."}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium transition-all duration-200 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 group-hover:border-slate-300"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isRecording && handleSend()}
                            disabled={sending || isRecording}
                        />
                    </div>

                    {!input.trim() && !sending ? (
                        <Button
                            variant={isRecording ? "destructive" : "outline"}
                            size="icon"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`h-11 w-11 rounded-full transition-all duration-300 shadow-sm active:scale-90 ${isRecording
                                ? "bg-red-600 text-white hover:bg-red-700 animate-pulse border-none"
                                : "border-slate-200 hover:border-blue-500/50 hover:bg-blue-50 group"
                                }`}
                        >
                            <Mic className={`h-5 w-5 ${!isRecording && "text-slate-500 group-hover:text-blue-600"}`} />
                        </Button>
                    ) : (
                        <Button
                            onClick={() => handleSend()}
                            disabled={sending || !input.trim() || isRecording}
                            className="h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {sending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
