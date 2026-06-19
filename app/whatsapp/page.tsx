"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CreateContactDialog } from '@/components/ops/CreateContactDialog';
import {
    MessageSquare,
    User,
    Clock,
    AlertCircle,
    CheckCircle2,
    Search,
    Filter,
    MoreVertical,
    Send,
    Bot,
    UserCircle,
    Phone,
    MapPin,
    DollarSign,
    ClipboardList,
    FileText,
    Calendar as CalendarIcon,
    Plus,
    Maximize2,
    Loader2,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2 as Loader,
    Home,
    Paperclip,
    Image as ImageIcon,
    File as LucideFile,
    PlayCircle,
    Mic
} from 'lucide-react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { getMetaStatus } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Definición de las columnas lógicas
const COLUMNS = [
    { id: 'inbox', title: 'Entrada', icon: <MessageSquare className="text-blue-500" size={18} />, description: 'Nuevos mensajes' },
    { id: 'donna', title: 'Donna Activa', icon: <Bot className="text-purple-500" size={18} />, description: 'IA en control' },
    { id: 'urgent', title: 'Intervención César', icon: <AlertCircle className="text-red-500" size={18} />, description: 'Requiere humano' },
    { id: 'done', title: 'Finalizados', icon: <CheckCircle2 className="text-green-500" size={18} />, description: 'Cerrados' }
];


export default function ChatCenterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [chats, setChats] = useState<any[]>([]);
    const [isMetaConfigured, setIsMetaConfigured] = useState(true); // Default to true to avoid flash

    // UI State
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'console'>('kanban');
    const [activeTab, setActiveTab] = useState('info'); // Changed default to 'info'

    // Chat Data
    const [messages, setMessages] = useState<any[]>([]);
    const [isFetchingMessages, setIsFetchingMessages] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Multimedia State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingMedia, setPendingMedia] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const recordingMimeType = useRef<string>('');

    // Form States (Right Panel)
    const [newTask, setNewTask] = useState({ title: '', priority: 'medium', dueDate: '' });
    const [newEvent, setNewEvent] = useState({ title: '', startTime: '', endTime: '', googleSync: true });
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    // Entity Details State
    const [fullDetails, setFullDetails] = useState<any>(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [editedFields, setEditedFields] = useState<any>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // 🔒 Ref para acceder siempre al selectedChat ACTUAL dentro de setInterval
    // sin que sufra el problema de stale closure.
    const selectedChatRef = useRef<any>(null);
    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    const fetchChats = async () => {
        try {
            // cache: 'no-store' evita que el browser cachee la respuesta GET
            const res = await fetch('/api/whatsapp/chats', { cache: 'no-store' });
            const data = await res.json();
            if (data.success) {
                setChats(data.chats);
                // Actualizar el chat seleccionado si cambió
                const currentSelected = selectedChatRef.current;
                if (currentSelected) {
                    const updatedSelected = data.chats.find((c: any) => c.id === currentSelected.id);
                    if (updatedSelected) {
                        setSelectedChat((prev: any) => ({ ...prev, ...updatedSelected }));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (chatId: string, quiet = false) => {
        if (!quiet) setIsFetchingMessages(true);
        try {
            // cache: 'no-store' garantiza datos frescos del servidor siempre
            const res = await fetch(`/api/whatsapp/chats/${chatId}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success) {
                // Solo actualizar si hay cambios para evitar parpadeos innecesarios
                setMessages(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data.messages)) return prev;
                    return data.messages;
                });
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            if (!quiet) toast({
                title: "Error",
                description: "No se pudo cargar el historial de mensajes.",
                variant: "destructive"
            });
        } finally {
            if (!quiet) setIsFetchingMessages(false);
        }
    };

    const fetchFullDetails = async (id: string, type: string) => {
        setIsFetchingDetails(true);
        try {
            const res = await fetch(`/api/whatsapp/chats/${id}/details?type=${type}`);
            const data = await res.json();
            if (data.success) {
                setFullDetails(data.data);
                setEditedFields({});
            }
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const handleToggleBot = async (checked: boolean) => {
        if (!selectedChat || !fullDetails) return;
        const newMode = checked ? 'active' : 'paused';

        setIsSavingDetails(true);
        try {
            const res = await fetch(`/api/whatsapp/chats/${selectedChat.id}/details`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedChat.entityType,
                    botMode: newMode
                })
            });
            const data = await res.json();
            if (data.success) {
                setFullDetails(data.data);
                toast({
                    title: newMode === 'active' ? "Donna Activada" : "Donna Pausada",
                    description: `El asistente ${newMode === 'active' ? 'ahora responderá' : 'ya no responderá'} a este chat.`
                });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSavingDetails(false);
        }
    };

    const handleSaveDetails = async () => {
        if (!selectedChat || Object.keys(editedFields).length === 0) return;
        setIsSavingDetails(true);
        try {
            const res = await fetch(`/api/whatsapp/chats/${selectedChat.id}/details`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedChat.entityType,
                    ...editedFields
                })
            });
            const data = await res.json();
            if (data.success) {
                setFullDetails(data.data);
                setEditedFields({});
                toast({ title: "Datos actualizados", description: "La ficha del cliente ha sido guardada." });
                fetchChats(); // Refresh list to get updated names/cities if changed
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSavingDetails(false);
        }
    };

    // 🔄 Polling de LISTA DE CHATS — se monta una vez y NO se recrea
    // Usa selectedChatRef para leer el chat actual sin stale closure
    useEffect(() => {
        fetchChats();
        getMetaStatus().then(res => {
            if (res.success) setIsMetaConfigured(res.isConfigured);
        });

        // Polling cada 8 segundos (reducido de 10 para ser más reactivo)
        const chatListInterval = setInterval(fetchChats, 8000);
        return () => clearInterval(chatListInterval);
    }, []); // Sin dependencias: el interval vive toda la sesión

    // 🔄 Polling de MENSAJES DEL CHAT ACTIVO — se re-crea al cambiar de chat
    useEffect(() => {
        if (!selectedChat?.id) return;
        // Fetch inmediato al abrir el chat
        fetchMessages(selectedChat.id, true);
        // Luego polling cada 5 segundos
        const messageInterval = setInterval(() => {
            const current = selectedChatRef.current;
            if (current?.id) {
                fetchMessages(current.id, true);
            }
        }, 5000);
        return () => clearInterval(messageInterval);
    }, [selectedChat?.id]); // Se recrea solo cuando cambia el chat seleccionado


    const handleChatClick = (chat: any) => {
        console.log('📱 Chat seleccionado:', chat.id, chat.contactName, chat.entityType);
        setSelectedChat(chat);
        setFullDetails(null); // Clear previous details to avoid stale data
        setViewMode('console');
        fetchMessages(chat.id);
        fetchFullDetails(chat.id, chat.entityType);
    };

    const [proposalVariables, setProposalVariables] = useState<any>(null);
    const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);

    const handleGenerateProposal = async () => {
        if (!selectedChat) return;
        setIsGeneratingProposal(true);
        try {
            const res = await fetch('/api/trainer/proposal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: selectedChat.id,
                    source: selectedChat.entityType // 'discovery' or 'contact'
                })
            });
            const data = await res.json();
            if (data.success) {
                setProposalVariables(data.variables);
                toast({ title: "Propuesta Generada", description: "Variables inteligentes calculadas." });
                setActiveTab('proposals');
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsGeneratingProposal(false);
        }
    };

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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileInput = e.target.files?.[0];
        if (!fileInput) return;

        console.log('📎 File selected:', fileInput.name, fileInput.type);
        toast({ title: "Procesando archivo...", description: `Analizando ${fileInput.name}` });

        try {
            // SPECIAL HANDLING FOR VCARD -> Native Contact
            if (fileInput.name.toLowerCase().endsWith('.vcf')) {
                const text = await fileInput.text();
                // Simple parser for FN (Name) and TEL (Phone)
                const fnMatch = text.match(/^FN:(.*)$/m);
                const telMatch = text.match(/^TEL.*:(.*)$/m);

                const name = fnMatch ? fnMatch[1].trim() : fileInput.name.replace('.vcf', '');
                const phone = telMatch ? telMatch[1].trim().replace(/[^0-9+]/g, '') : '';

                if (phone) {
                    try {
                        console.log('👤 vCard Parsed:', { name, phone });
                        await handleSendMessage(undefined, {
                            type: 'contacts',
                            contacts: [{
                                name: { formatted_name: name, first_name: name },
                                phones: [{ phone: phone, type: "CELL" }]
                            }]
                        });
                        toast({ title: "Contacto enviado", description: `Se envió a ${name} como contacto.` });
                        return; // Successfully sent as Contact
                    } catch (error) {
                        console.error('⚠️ Failed to send as Contact, falling back to Document upload:', error);
                        toast({ title: "Aviso", description: "Enviando como archivo por error de formato de contacto...", variant: "default" });
                        // Fall through to standard upload logic below
                    }
                } else {
                    console.warn('⚠️ vCard parsing failed (no phone found), falling back to document upload');
                }
            }

            setIsUploading(true);
            // ... Standard upload logic for other files ...
            let type = 'document';
            let finalFile = fileInput;

            if (fileInput.type.startsWith('image/')) type = 'image';
            else if (fileInput.type.startsWith('video/')) type = 'video';
            else if (fileInput.type.startsWith('audio/')) type = 'audio';
            // Fallback for vCard if parsing failed above
            else if (fileInput.name.toLowerCase().endsWith('.vcf')) {
                if (!fileInput.type) {
                    finalFile = new File([fileInput], fileInput.name, { type: 'text/vcard' });
                }
            }

            const data = await uploadFile(finalFile, type);
            if (data.success) {
                setPendingMedia({
                    id: data.mediaId,
                    type,
                    name: finalFile.name
                });
                toast({ title: "Archivo listo", description: `${finalFile.name} cargado correctamente.` });
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ title: "Error de carga", description: error.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            console.log('🎤 Requesting mic permission...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('🎤 Mic stream active');

            // Detect supported mime type
            const types = [
                'audio/mp4',
                'audio/mpeg',
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/ogg'
            ];

            let selectedType = undefined;
            for (const type of types) {
                if (MediaRecorder.isTypeSupported(type)) {
                    selectedType = type;
                    break;
                }
            }

            console.log('🎤 Selected MIME:', selectedType || 'default');

            // If selectedType is found, use it. Otherwise use default (undefined options)
            mediaRecorder.current = selectedType
                ? new MediaRecorder(stream, { mimeType: selectedType })
                : new MediaRecorder(stream);

            recordingMimeType.current = mediaRecorder.current.mimeType; // Browser reports actual Type
            console.log('🎤 Recorder Initialized with:', recordingMimeType.current);

            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = async () => {
                console.log('🎤 Recording stopped. Processing...');
                const mimeType = recordingMimeType.current || 'audio/webm';
                const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                console.log('🎤 Blob created:', audioBlob.size, audioBlob.type);

                // Determine extension based on mime type
                let ext = 'webm';
                if (mimeType.includes('mp4')) ext = 'mp4';
                else if (mimeType.includes('ogg')) ext = 'ogg';
                else if (mimeType.includes('aac')) ext = 'aac';
                else if (mimeType.includes('wav')) ext = 'wav';

                const fileName = `voice_${Date.now()}.${ext}`;
                const file = new File([audioBlob], fileName, { type: mimeType });

                try {
                    toast({ title: "Enviando audio...", description: "Subiendo nota de voz." });
                    setIsSending(true);
                    const uploadResult = await uploadFile(file, 'audio');
                    console.log('🎤 Upload result:', uploadResult);

                    await handleSendMessage(undefined, {
                        type: 'audio',
                        id: uploadResult.mediaId,
                        name: fileName
                    });
                    toast({ title: "Audio enviado", description: "Nota de voz entregada." });
                } catch (err: any) {
                    console.error("Failed to send audio", err);
                    toast({
                        title: "Error al enviar",
                        description: err.message || "No se pudo enviar la nota de voz.",
                        variant: "destructive"
                    });
                } finally {
                    setIsSending(false);
                }
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            toast({ title: "Grabando...", description: "Hable ahora." });
        } catch (err) {
            console.error("Mic access denied or error", err);
            toast({
                title: "Error de grabación",
                description: "No se pudo iniciar la grabación. Verifique permisos.",
                variant: "destructive"
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, mediaOverride?: any) => {
        if (e) e.preventDefault();
        const content = replyText.trim();
        const media = mediaOverride || pendingMedia;

        console.log('🚀 Sending message attempt:', { phone: selectedChat?.phone, text: content, media });

        if (!content && !media) {
            console.warn('⚠️ Missing text or media');
            return;
        }

        if (!selectedChat || !selectedChat.phone) {
            toast({
                title: "Error de Envío",
                description: "El contacto no tiene un número de teléfono válido.",
                variant: "destructive"
            });
            return;
        }

        setIsSending(true);
        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: selectedChat.phone,
                    text: content,
                    media: media ? {
                        type: media.type,
                        id: media.id,
                        caption: content,
                        filename: media.name
                    } : undefined,
                    metadata: {
                        contactId: selectedChat.entityType === 'contact' ? selectedChat.id : null,
                        discoveryLeadId: selectedChat.entityType === 'discovery' ? selectedChat.id : null,
                        source: 'chat_center_console'
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                setReplyText('');
                setPendingMedia(null);
                fetchMessages(selectedChat.id);
                toast({ title: "Mensaje enviado" });
            } else {
                throw new Error(data.error || 'Error al enviar');
            }
        } catch (error: any) {
            toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const handleCreateTask = async () => {
        if (!newTask.title || !selectedChat) return;
        setIsSubmittingAction(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newTask,
                    contactId: selectedChat.entityType === 'contact' ? selectedChat.id : null,
                    relatedLeadId: selectedChat.entityType === 'discovery' ? selectedChat.id : null,
                })
            });
            if (res.ok) {
                toast({ title: "Tarea creada", description: "Se ha añadido a tus pendientes." });
                setNewTask({ title: '', priority: 'medium', dueDate: '' });
            } else {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al crear la tarea');
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const handleScheduleEvent = async () => {
        if (!newEvent.title || !selectedChat) return;
        setIsSubmittingAction(true);
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newEvent,
                    contactId: selectedChat.entityType === 'contact' ? selectedChat.id : null,
                    relatedLeadId: selectedChat.entityType === 'discovery' ? selectedChat.id : null,
                })
            });
            if (res.ok) {
                toast({ title: "Evento agendado", description: "Sincronizado con éxito." });
                setNewEvent({ title: '', startTime: '', endTime: '', googleSync: true });
            } else {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al agendar el evento');
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const formatTime = (time: any) => {
        if (!time) return '';
        const date = new Date(time);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return date.toLocaleDateString();
    };

    const getColumnChats = (columnId: string) => {
        const filtered = chats.filter(chat => chat.status === columnId);
        if (!searchQuery) return filtered;

        const query = searchQuery.toLowerCase();
        return filtered.filter(chat =>
            chat.contactName.toLowerCase().includes(query) ||
            (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query)) ||
            (chat.city && chat.city.toLowerCase().includes(query))
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-gray-100 overflow-hidden">
            {/* Minimal Header */}
            <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white"
                        onClick={() => router.push('/dashboard')}
                    >
                        <Home size={20} />
                    </Button>
                    <div className="p-1.5 bg-brand-tomate rounded flex items-center justify-center">
                        <MessageSquare className="text-white" size={18} />
                    </div>
                    <h1 className="text-lg font-bold">Consola de Chats</h1>
                </div>

                {viewMode === 'console' && selectedChat && (
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-1">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 font-medium">
                            <User size={12} className="mr-2" />
                            {selectedChat.contactName} {selectedChat.phone && <span className="ml-2 text-blue-500/60 font-mono">({selectedChat.phone})</span>}
                        </Badge>
                        {(selectedChat.contactName.replace(/\D/g, '').length >= 7 && !selectedChat.contactName.match(/[a-zA-Z]/)) && (
                            <CreateContactDialog contactId={selectedChat.id} phoneNumber={selectedChat.phone} />
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setViewMode('kanban')} className="text-gray-400 hover:text-white">
                            <Maximize2 size={16} className="mr-2" /> Ver Kanban
                        </Button>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <div className="relative w-64 hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar..."
                            className="bg-gray-800 border-gray-700 h-8 pl-9 text-xs"
                        />
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 text-[10px]">
                        Live
                    </Badge>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">

                {/* COL 1: CHAT LIST / KANBAN COLLAPSED */}
                <div className={`transition-all duration-300 border-r border-gray-800 bg-gray-950/50 ${viewMode === 'console' ? 'w-80' : 'w-full'} flex flex-col`}>
                    <ScrollArea className="flex-1">
                        {viewMode === 'kanban' ? (
                            <div className="flex-1 overflow-x-auto p-4 flex gap-4 scrollbar-hide h-full">
                                {COLUMNS.map((col) => (
                                    <div key={col.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-2">
                                                {col.icon}
                                                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">{col.title} ({getColumnChats(col.id).length})</h3>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pb-4">
                                            {getColumnChats(col.id).map((chat) => (
                                                <ChatCard key={chat.id} chat={chat} isSelected={selectedChat?.id === chat.id} onClick={handleChatClick} formatTime={formatTime} />
                                            ))}
                                            {getColumnChats(col.id).length === 0 && (
                                                <div className="h-32 border border-dashed border-gray-800 rounded-lg flex items-center justify-center opacity-20 italic text-xs">Vacío</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                <div className="p-2 mb-2 flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Inbox Activo</h3>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewMode('kanban')}><Maximize2 size={12} /></Button>
                                </div>
                                {chats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        onClick={() => handleChatClick(chat)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 border ${selectedChat?.id === chat.id ? 'bg-blue-600/10 border-blue-600/50' : 'bg-transparent border-transparent hover:bg-gray-800/50'}`}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                                                <UserCircle size={20} className="text-gray-500" />
                                            </div>
                                            {chat.unread && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-black" />}
                                        </div>
                                        <div className="overflow-hidden flex-1 min-w-0">
                                            <div className="flex justify-between items-center gap-2">
                                                <p className="text-[11px] font-bold truncate">{chat.contactName}</p>
                                                <span className="text-[9px] text-gray-500 shrink-0">{formatTime(chat.time)}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 truncate italic">"{chat.lastMessage}"</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* COL 2: MAIN MESSAGES Area (Only in console mode) */}
                {viewMode === 'console' && (
                    <div className="flex-1 flex flex-col bg-gray-950 border-r border-gray-800 animate-in slide-in-from-left-2 shadow-2xl z-10">
                        {selectedChat ? (
                            <>
                                <ScrollArea className="flex-1 p-2 md:p-3 relative">
                                    {/* Fondo estilo WhatsApp (Sutil) */}
                                    <div className="absolute inset-0 bg-[#0b141a] opacity-95 -z-10" />
                                    <div className="absolute inset-0 bg-repeat opacity-[0.03] pointer-events-none -z-10"
                                        style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }} />

                                    {isFetchingMessages ? (
                                        <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-tomate" />
                                            <p className="text-sm font-medium tracking-wide">Sincronizando...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-w-5xl mx-auto relative z-10 py-4">
                                            {messages.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                                    <MessageSquare size={40} />
                                                    <p className="mt-2 text-xs">Sin mensajes</p>
                                                </div>
                                            )}
                                            {messages.map((msg: any, idx: number) => {
                                                const isOutbound = msg.direction === 'outbound';
                                                const media = msg.metadata?.media;
                                                const contactInitial = selectedChat.contactName ? selectedChat.contactName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

                                                return (
                                                    <div key={msg.id || idx} className={`flex gap-3 ${isOutbound ? 'justify-end' : 'justify-start'} mb-2`}>
                                                        {!isOutbound && (
                                                            <div className="flex-shrink-0 mt-1">
                                                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-gray-700 shadow-sm transition-transform hover:scale-110">
                                                                    {contactInitial}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className={cn(
                                                            "relative max-w-[85%] md:max-w-[75%] p-3.5 px-4 rounded-2xl text-[14px] shadow-lg transition-all duration-200",
                                                            isOutbound
                                                                ? "bg-blue-600 text-white rounded-tr-none shadow-blue-500/10"
                                                                : "bg-[#202c33] text-[#e9edef] rounded-tl-none border border-white/5"
                                                        )}>
                                                            {/* Multimedia Rendering */}
                                                            {media && (
                                                                <div className="mb-3 space-y-2">
                                                                    {media.type === 'image' && (
                                                                        <div className="rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-inner relative">
                                                                            <div className="relative w-full h-auto aspect-square max-w-sm">
                                                                                <Image
                                                                                    src={media.id ? `/api/whatsapp/media/${media.id}` : media.url}
                                                                                    alt="WhatsApp Image"
                                                                                    fill
                                                                                    className="object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                                                                                    onClick={() => window.open(media.id ? `/api/whatsapp/media/${media.id}` : media.url, '_blank')}
                                                                                    unoptimized
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {media.type === 'video' && (
                                                                        <div className="rounded-xl overflow-hidden bg-black/40 p-4 flex items-center gap-3 border border-white/10">
                                                                            <div className="p-2 bg-white/10 rounded-full">
                                                                                <PlayCircle className="text-white" size={20} />
                                                                            </div>
                                                                            <span className="text-xs font-medium">Video de WhatsApp</span>
                                                                        </div>
                                                                    )}
                                                                    {(media.type === 'audio' || media.type === 'voice') && (
                                                                        <div className="rounded-xl overflow-hidden bg-black/40 p-3 flex flex-col gap-2 min-w-[260px] border border-white/10">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                                    <Mic size={20} className="text-blue-400" />
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <audio
                                                                                        controls
                                                                                        className="h-8 w-full filter saturate-50 opacity-80"
                                                                                        src={media.id ? `/api/whatsapp/media/${media.id}` : media.url}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-[10px] opacity-60 ml-1 font-bold tracking-widest uppercase">Mensaje de voz</span>
                                                                        </div>
                                                                    )}
                                                                    {media.type === 'document' && (
                                                                        <div className="rounded-xl overflow-hidden bg-black/40 p-3 flex items-center gap-3 border border-white/10">
                                                                            <div className="p-2 bg-white/10 rounded-lg">
                                                                                <LucideFile size={18} className="text-gray-300" />
                                                                            </div>
                                                                            <span className="text-xs font-bold truncate max-w-[180px]">{media.filename || 'Documento'}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                                                            <div className={cn(
                                                                "text-[10px] mt-2 flex items-center gap-2 justify-end font-bold uppercase tracking-wider",
                                                                isOutbound ? "text-blue-100/70" : "text-gray-500"
                                                            )}>
                                                                <span>{new Date(msg.performedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {isOutbound && (
                                                                    <div className="flex items-center">
                                                                        <CheckCircle2 size={12} className={msg.status === 'read' ? 'text-blue-300' : 'text-blue-100/40'} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isOutbound && (
                                                            <div className="flex-shrink-0 mt-1">
                                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white border border-blue-500 shadow-lg shadow-blue-500/20 transition-transform hover:scale-110">
                                                                    DO
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </ScrollArea>

                                <div className="p-6 border-t border-gray-800 bg-gray-900/40 backdrop-blur-xl">
                                    <div className="max-w-4xl mx-auto flex flex-col gap-3">
                                        {isRecording && (
                                            <div className="flex items-center justify-between bg-red-500/5 p-3 rounded-xl border border-red-500/10 animate-pulse">
                                                <div className="flex items-center gap-3 text-red-600 text-[10px] font-bold uppercase tracking-widest">
                                                    <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                                    Grabando Nota de Voz...
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-7 px-4 text-[9px] font-bold uppercase tracking-widest rounded-full"
                                                    onClick={stopRecording}
                                                >
                                                    Detener y Enviar
                                                </Button>
                                            </div>
                                        )}

                                        {pendingMedia && (
                                            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                                        {pendingMedia.type === 'image' ? <ImageIcon size={16} className="text-blue-400" /> : <LucideFile size={16} className="text-blue-400" />}
                                                    </div>
                                                    <span className="text-xs text-blue-300 font-bold truncate max-w-[250px]">{pendingMedia.name}</span>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full" onClick={() => setPendingMedia(null)}>
                                                    <X size={16} />
                                                </Button>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                                    <label className="cursor-pointer text-gray-500 hover:text-blue-400 transition-all active:scale-90 flex">
                                                        {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                                                        <input type="file" className="hidden" onChange={handleFileSelect} disabled={isUploading || isSending || isRecording} />
                                                    </label>
                                                </div>
                                                <Textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder={isRecording ? "Silencio, grabando..." : (pendingMedia ? "Añadir un comentario..." : "Escribe un mensaje...")}
                                                    className="w-full bg-gray-800/50 border-gray-700/50 rounded-2xl min-h-[56px] max-h-[200px] resize-none focus-visible:ring-blue-500/50 focus-visible:bg-gray-800 transition-all text-sm scrollbar-hide pl-12 pr-12 pt-4"
                                                    disabled={isSending || isUploading || isRecording}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendMessage();
                                                        }
                                                    }}
                                                />
                                                <div className="absolute right-3 bottom-3 flex gap-1">
                                                    {!replyText.trim() && !pendingMedia && !isSending && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={isRecording ? stopRecording : startRecording}
                                                            className={cn(
                                                                "h-9 w-9 rounded-xl transition-all",
                                                                isRecording ? "text-red-500 bg-red-500/10 animate-pulse" : "text-gray-400 hover:bg-gray-400/10"
                                                            )}
                                                        >
                                                            <Mic size={18} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9 rounded-xl text-purple-400 hover:bg-purple-400/10 transition-colors"
                                                        disabled={isGeneratingProposal || isRecording}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleGenerateProposal();
                                                        }}
                                                    >
                                                        <Bot size={18} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleSendMessage()}
                                                disabled={isSending || isUploading || (!replyText.trim() && !pendingMedia) || isRecording}
                                                className="bg-blue-600 hover:bg-blue-500 text-white h-[56px] px-8 rounded-2xl shrink-0 shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-bold"
                                            >
                                                {isSending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send size={20} />}
                                                <span className="hidden md:inline">Enviar</span>
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col items-center gap-1">
                                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-40">
                                            {selectedChat.contactName} • {selectedChat.phone}
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 opacity-20">
                                <MessageSquare size={80} />
                                <p className="mt-4 font-bold uppercase tracking-widest text-sm">Selecciona una conversación</p>
                            </div>
                        )}
                    </div>
                )}

                {/* COL 3: ACTION PANEL / CLIENT DATA */}
                {viewMode === 'console' && selectedChat && (
                    <div className="w-[350px] flex flex-col bg-gray-900/50 backdrop-blur-md animate-in slide-in-from-right-4 border-l border-gray-800">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                            <div className="p-2 border-b border-gray-800">
                                <TabsList className="grid w-full grid-cols-3 bg-black/40 h-8">
                                    <TabsTrigger value="info" className="text-[10px]"><User size={12} className="mr-1" /> Ficha</TabsTrigger>
                                    <TabsTrigger value="actions" className="text-[10px]"><ClipboardList size={12} className="mr-1" /> Acciones</TabsTrigger>
                                    <TabsTrigger value="proposals" className="text-[10px]"><FileText size={12} className="mr-1" /> Propuesta</TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1">
                                <TabsContent value="info" className="p-4 space-y-4 m-0">
                                    {isFetchingDetails ? (
                                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                            <Loader2 className="animate-spin mb-2" />
                                            <p className="text-[10px] uppercase tracking-widest">Cargando expediente...</p>
                                        </div>
                                    ) : fullDetails ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase">Ficha Técnica 360°</h4>
                                                {Object.keys(editedFields).length > 0 && (
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSaveDetails}
                                                        disabled={isSavingDetails}
                                                        className="h-6 text-[9px] bg-green-600 hover:bg-green-700 h-7"
                                                    >
                                                        {isSavingDetails ? <Loader2 className="animate-spin h-3 w-3" /> : 'Guardar Cambios'}
                                                    </Button>
                                                )}
                                            </div>

                                            <Accordion type="single" collapsible className="w-full space-y-2 border-none">
                                                {/* Grouping fields based on entity type */}
                                                {(selectedChat.entityType === 'discovery' || selectedChat.entityType === 'campaign') ? (
                                                    <>
                                                        <AccordionItem value="id" className="border border-gray-800 rounded-xl bg-gray-900/40 px-3 border-b-0">
                                                            <AccordionTrigger className="text-xs hover:no-underline py-3">Identificación Legal</AccordionTrigger>
                                                            <AccordionContent className="space-y-3 pt-1">
                                                                <DetailField label="RUC" field="ruc" value={fullDetails.ruc} onChange={(v: string) => setEditedFields({ ...editedFields, ruc: v })} />
                                                                <DetailField label="Nombre Comercial" field="nombreComercial" value={fullDetails.nombreComercial} onChange={(v: string) => setEditedFields({ ...editedFields, nombreComercial: v })} />
                                                                <DetailField label="Razón Social" field="razonSocialPropietario" value={fullDetails.razonSocialPropietario} onChange={(v: string) => setEditedFields({ ...editedFields, razonSocialPropietario: v })} />
                                                                <DetailField label="Representante" field="representanteLegal" value={fullDetails.representanteLegal} onChange={(v: string) => setEditedFields({ ...editedFields, representanteLegal: v })} />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                        <AccordionItem value="loc" className="border border-gray-800 rounded-xl bg-gray-900/40 px-3 border-b-0">
                                                            <AccordionTrigger className="text-xs hover:no-underline py-3">Ubicación y Datos</AccordionTrigger>
                                                            <AccordionContent className="space-y-3 pt-1">
                                                                <DetailField label="Provincia" field="provincia" value={fullDetails.provincia} onChange={(v: string) => setEditedFields({ ...editedFields, provincia: v })} />
                                                                <DetailField label="Cantón" field="canton" value={fullDetails.canton} onChange={(v: string) => setEditedFields({ ...editedFields, canton: v })} />
                                                                <DetailField label="Dirección" field="direccion" value={fullDetails.direccion} onChange={(v: string) => setEditedFields({ ...editedFields, direccion: v })} />
                                                                <DetailField label="Lat/Long" value={`${fullDetails.latitud || ''}, ${fullDetails.longitud || ''}`} readOnly />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                        <AccordionItem value="contact" className="border border-gray-800 rounded-xl bg-gray-900/40 px-3 border-b-0">
                                                            <AccordionTrigger className="text-xs hover:no-underline py-3">Contacto Directo</AccordionTrigger>
                                                            <AccordionContent className="space-y-3 pt-1">
                                                                <DetailField label="Teléfono" field="telefonoPrincipal" value={fullDetails.telefonoPrincipal} onChange={(v: string) => setEditedFields({ ...editedFields, telefonoPrincipal: v })} />
                                                                <DetailField label="Email" field="correoElectronico" value={fullDetails.correoElectronico} onChange={(v: string) => setEditedFields({ ...editedFields, correoElectronico: v })} />
                                                                <DetailField label="Web" field="direccionWeb" value={fullDetails.direccionWeb} onChange={(v: string) => setEditedFields({ ...editedFields, direccionWeb: v })} />
                                                                <DetailField label="Persona Contacto" field="personaContacto" value={fullDetails.personaContacto} onChange={(v: string) => setEditedFields({ ...editedFields, personaContacto: v })} />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                        <AccordionItem value="ops" className="border border-gray-800 rounded-xl bg-gray-900/40 px-3 border-b-0">
                                                            <AccordionTrigger className="text-xs hover:no-underline py-3">Operativo y Capacidad</AccordionTrigger>
                                                            <AccordionContent className="space-y-3 pt-1">
                                                                <DetailField label="Trabajadores" field="totalTrabajadores" value={fullDetails.totalTrabajadores} type="number" onChange={(v: string) => setEditedFields({ ...editedFields, totalTrabajadores: parseInt(v) })} />
                                                                <DetailField label="Habitaciones" field="totalHabitacionesTiendas" value={fullDetails.totalHabitacionesTiendas} type="number" onChange={(v: string) => setEditedFields({ ...editedFields, totalHabitacionesTiendas: parseInt(v) })} />
                                                                <DetailField label="Camas" field="totalCamas" value={fullDetails.totalCamas} type="number" onChange={(v: string) => setEditedFields({ ...editedFields, totalCamas: parseInt(v) })} />
                                                                <DetailField label="Mesas" field="totalMesas" value={fullDetails.totalMesas} type="number" onChange={(v: string) => setEditedFields({ ...editedFields, totalMesas: parseInt(v) })} />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AccordionItem value="basic" className="border border-gray-800 rounded-xl bg-gray-900/40 px-3 border-b-0">
                                                            <AccordionTrigger className="text-xs hover:no-underline py-3">Información Básica</AccordionTrigger>
                                                            <AccordionContent className="space-y-3 pt-1">
                                                                <DetailField label="Empresa" field="businessName" value={fullDetails.businessName} onChange={(v: string) => setEditedFields({ ...editedFields, businessName: v })} />
                                                                <DetailField label="Representante" field="contactName" value={fullDetails.contactName} onChange={(v: string) => setEditedFields({ ...editedFields, contactName: v })} />
                                                                <DetailField label="Ciudad" field="city" value={fullDetails.city} onChange={(v: string) => setEditedFields({ ...editedFields, city: v })} />
                                                                <DetailField label="Email" field="email" value={fullDetails.email} onChange={(v: string) => setEditedFields({ ...editedFields, email: v })} />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                        <AccordionItem value="strategic" className="border border-gray-800 rounded-xl bg-gray-900/40 px-3 border-b-0">
                                                            <AccordionTrigger className="text-xs hover:no-underline py-3">Perfil Estratégico</AccordionTrigger>
                                                            <AccordionContent className="space-y-3 pt-1">
                                                                <DetailField label="Dolores" field="pains" value={fullDetails.pains} area onChange={(v: string) => setEditedFields({ ...editedFields, pains: v })} />
                                                                <DetailField label="Metas" field="goals" value={fullDetails.goals} area onChange={(v: string) => setEditedFields({ ...editedFields, goals: v })} />
                                                                <DetailField label="Objeciones" field="objections" value={fullDetails.objections} area onChange={(v: string) => setEditedFields({ ...editedFields, objections: v })} />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                        <AccordionItem value="swot" className="border border-gray-800 rounded-xl bg-gray-900/40 px-3 border-b-0">
                                                            <AccordionTrigger className="text-xs hover:no-underline py-3">Análisis FODA</AccordionTrigger>
                                                            <AccordionContent className="space-y-3 pt-1">
                                                                <DetailField label="Fortalezas" field="strengths" value={fullDetails.strengths} area onChange={(v: string) => setEditedFields({ ...editedFields, strengths: v })} />
                                                                <DetailField label="Oportunidades" field="opportunities" value={fullDetails.opportunities} area onChange={(v: string) => setEditedFields({ ...editedFields, opportunities: v })} />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </>
                                                )}
                                            </Accordion>

                                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                                <h4 className="text-[10px] font-bold text-amber-500 uppercase mb-3 text-center">Estatus Comercial</h4>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                                                        <span className="text-xs text-gray-400 font-medium">Deuda Pendiente:</span>
                                                        <Badge className="bg-amber-500 text-black font-extrabold h-6">
                                                            ${selectedChat.debts || 0}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-purple-500/10 p-2 px-3 rounded-lg border border-purple-500/20">
                                                        <Switch
                                                            checked={(fullDetails.botMode || 'active') === 'active'}
                                                            onCheckedChange={handleToggleBot}
                                                            disabled={isSavingDetails}
                                                            className="data-[state=checked]:bg-purple-600"
                                                        />
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <Bot size={14} className={(fullDetails.botMode || 'active') === 'active' ? "text-purple-400" : "text-gray-500"} />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[10px] font-bold text-purple-300 uppercase leading-tight truncate">Asistente Donna</span>
                                                                <span className="text-[9px] text-gray-500 font-medium">{(fullDetails.botMode || 'active') === 'active' ? 'ENCENDIDO' : 'PAUSADO'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={handleGenerateProposal}
                                                        disabled={isGeneratingProposal}
                                                        variant="outline"
                                                        className="w-full border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs h-8"
                                                    >
                                                        {isGeneratingProposal ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <FileText size={12} className="mr-2" />}
                                                        Generar Estrategia IA
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-500 italic text-xs">Error al cargar datos.</div>
                                    )}
                                </TabsContent>

                                <TabsContent value="actions" className="p-4 space-y-6 m-0">
                                    {/* Task Creation */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                            <ClipboardList size={12} /> Tarea Pendiente
                                        </h4>
                                        <div className="grid gap-2">
                                            <Input
                                                placeholder="Ej: Llamar lunes 4pm"
                                                value={newTask.title}
                                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                                className="bg-gray-800 border-gray-700 text-xs h-9"
                                            />
                                            <div className="flex gap-2">
                                                <Input
                                                    type="date"
                                                    value={newTask.dueDate}
                                                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 text-xs h-9"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleCreateTask}
                                                    disabled={isSubmittingAction || !newTask.title}
                                                    className="bg-blue-600 hover:bg-blue-700 text-xs h-9 px-3"
                                                >
                                                    OK
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calendar Scheduling */}
                                    <div className="space-y-3 pt-4 border-t border-gray-800">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                            <CalendarIcon size={12} /> Agendar en Google
                                        </h4>
                                        <div className="grid gap-2">
                                            <Input
                                                placeholder="Motivo de la sesión"
                                                value={newEvent.title}
                                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                                className="bg-gray-800 border-gray-700 text-xs h-9"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] text-gray-400 ml-1">Comienza</Label>
                                                    <Input
                                                        type="datetime-local"
                                                        value={newEvent.startTime}
                                                        onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                                        className="bg-gray-800 border-gray-700 text-xs h-9"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] text-gray-400 ml-1">Termina</Label>
                                                    <Input
                                                        type="datetime-local"
                                                        value={newEvent.endTime}
                                                        onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                                        className="bg-gray-800 border-gray-700 text-xs h-9"
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleScheduleEvent}
                                                disabled={isSubmittingAction || !newEvent.title || !newEvent.startTime}
                                                className="w-full bg-[#EA4335] hover:bg-[#d93025] text-white text-xs h-9 flex items-center justify-center gap-2"
                                            >
                                                {isSubmittingAction ? <Loader2 className="animate-spin h-3 w-3" /> : (
                                                    <><Plus size={14} /> Crear Evento</>
                                                )}
                                            </Button>
                                            <p className="text-[9px] text-gray-500 italic text-center">Incluye Google Meet automáticamente</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="proposals" className="p-4 m-0 space-y-4">
                                    {!proposalVariables ? (
                                        <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4 opacity-50">
                                            <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
                                                <FileText size={40} />
                                            </div>
                                            <div className="space-y-2">
                                                <h5 className="font-bold text-sm">Sin propuesta activa</h5>
                                                <p className="text-xs px-4">Usa el sistema de IA para generar un borrador inteligente basado en los datos de este chat.</p>
                                            </div>
                                            <Button onClick={handleGenerateProposal} disabled={isGeneratingProposal} className="bg-blue-600 hover:bg-blue-700">
                                                {isGeneratingProposal ? "Analizando..." : "Iniciar Generador"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-purple-400">
                                                    <Bot size={16} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">IA Generada</span>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-500" onClick={() => setProposalVariables(null)}><X size={14} /></Button>
                                            </div>

                                            <div className="space-y-3">
                                                <h5 className="text-xs font-bold text-gray-300">Variables de Negocio:</h5>
                                                <div className="grid gap-2">
                                                    {Object.keys(proposalVariables).slice(0, 6).map(key => (
                                                        <div key={key} className="p-2 bg-gray-800/80 rounded border border-gray-700 text-[10px] flex justify-between">
                                                            <span className="text-gray-500 uppercase">{key.replace(/_/g, ' ')}:</span>
                                                            <span className="text-blue-300 font-medium truncate max-w-[150px]">{proposalVariables[key]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Button className="w-full bg-green-600 hover:bg-green-700 h-9 text-xs">Aprobar y Enviar PDF</Button>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </div>
                )}
            </div>

            {/* Float sim warning */}
            {!isMetaConfigured && (
                <div className="text-[10px] bg-amber-500/10 text-amber-500 border-t border-amber-500/30 p-1 px-4 flex justify-between">
                    <span>⚠️ Simulando Meta API</span>
                    <span>Modo Pruebas Activado (Faltan Credenciales)</span>
                </div>
            )}
        </div>
    );
}

// Subcomponents helper to keep code clean
function ChatCard({ chat, isSelected, onClick, formatTime }: any) {
    return (
        <div
            onClick={() => onClick(chat)}
            className={cn(
                "group relative p-2 rounded-lg border transition-all cursor-pointer hover:bg-gray-800/80 shadow-sm",
                chat.unread ? 'bg-[#202c33] border-brand-tomate/40 shadow-brand-tomate/5' : 'bg-[#111b21] border-[#202c33]',
                isSelected ? 'ring-2 ring-brand-tomate border-transparent scale-[0.98]' : '',
                chat.isGhost ? 'border-dashed border-amber-500/30' : ''
            )}
        >
            <div className="flex justify-between items-start mb-0.5">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden",
                            chat.isGhost ? "bg-amber-500/10 border-amber-500/20" : "bg-gray-700 border-[#202c33]"
                        )}>
                            {chat.avatar ? (
                                <Image src={chat.avatar} alt="" fill className="object-cover" unoptimized />
                            ) : chat.isGhost ? (
                                <Bot size={24} className="text-amber-500/50" />
                            ) : (
                                <UserCircle size={28} className="text-gray-400" />
                            )}
                        </div>
                        {chat.unread && (
                            <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-brand-tomate rounded-full border-2 border-[#111b21] flex items-center justify-center">
                                <span className="text-[8px] text-white font-bold opacity-0">1</span>
                            </div>
                        )}
                    </div>
                    <div className="overflow-hidden min-w-0 flex-1">
                        <div className="flex justify-between items-baseline gap-2">
                            <p className={cn(
                                "font-bold text-[12px] truncate",
                                chat.isGhost ? "text-amber-400" : "text-[#e9edef]"
                            )}>
                                {chat.contactName}
                            </p>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-[10px] text-[#8696a0] flex items-center gap-1 font-medium italic truncate">
                                {chat.isGhost && <span className="text-amber-500/70 not-italic mr-1 shrink-0">(Ghost)</span>}
                                <span className="truncate">{chat.lastMessage || 'Sin mensajes'}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                        "text-[10px] shrink-0 font-medium",
                        chat.unread ? "text-brand-tomate" : "text-[#8696a0]"
                    )}>
                        {formatTime(chat.time)}
                    </span>
                    {chat.unread && <Badge className="bg-brand-tomate text-black h-4 px-1 text-[9px] font-extrabold rounded-full min-w-[16px] flex items-center justify-center">!</Badge>}
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-tight font-bold">
                    <MapPin size={10} /> {chat.city || 'Ubicación Desconocida'}
                </p>
                {chat.isGhost && (
                    <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-500 border-amber-500/20 h-4">
                        DESCONOCIDO
                    </Badge>
                )}
            </div>
        </div>
    );
}

// Helper for editable fields in the Info tab
function DetailField({ label, value, field, onChange, readOnly = false, type = "text", area = false }: any) {
    return (
        <div className="space-y-0.5">
            <Label className="text-[9px] text-gray-500 uppercase ml-1 tracking-tight">{label}</Label>
            {area ? (
                <Textarea
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    readOnly={readOnly}
                    className="bg-black/20 border-gray-800 text-xs min-h-[60px] resize-none focus-visible:ring-blue-500/30"
                />
            ) : (
                <Input
                    type={type}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    readOnly={readOnly}
                    className="bg-black/20 border-gray-800 text-xs h-8 focus-visible:ring-blue-500/30"
                />
            )}
        </div>
    );
}

