'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Mic,
    Square,
    Play,
    Activity,
    User,
    Target,
    Lightbulb,
    History,
    TrendingUp,
    BrainCircuit,
    AlertCircle,
    ChevronRight,
    ClipboardList,
    Phone,
    MapPin,
    Globe,
    Calendar,
    Save,
    CheckCircle,
    XCircle,
    MessageSquare,
    Zap
} from 'lucide-react';
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function TrainerPage() {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [talkRatio, setTalkRatio] = useState(50); // 50% closer, 50% lead
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [leadsList, setLeadsList] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // New State for Strategic Prep
    const [prepMode, setPrepMode] = useState<string>('asesor');
    const [prepResult, setPrepResult] = useState<any>(null);
    const [isPreparing, setIsPreparing] = useState(false);

    // Call Result Form State
    const [callOutcome, setCallOutcome] = useState<string>('no_contesto');
    const [callAction, setCallAction] = useState<string>('pendiente');
    const [callNotes, setCallNotes] = useState<string>('');
    const [isSavingResult, setIsSavingResult] = useState(false);
    const [lastInteraction, setLastInteraction] = useState<any>(null);

    // Real-time audio refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const [queueRes, investigatedRes, leadsRes] = await Promise.all([
                    fetch('/api/discovery?columna2=en_cola&limit=100'),
                    fetch('/api/discovery?status=investigated&limit=100'),
                    fetch('/api/leads')
                ]);

                let queue = [];
                let investigated = [];
                let leads = [];

                if (queueRes.ok) {
                    const data = await queueRes.json();
                    queue = data.leads || (Array.isArray(data) ? data : []);
                }
                if (investigatedRes.ok) {
                    const data = await investigatedRes.json();
                    investigated = data.leads || (Array.isArray(data) ? data : []);
                }
                if (leadsRes.ok) {
                    const data = await leadsRes.json();
                    leads = Array.isArray(data) ? data : [];
                }

                const discoveryLeadsMap = new Map();
                [...queue, ...investigated].forEach(l => {
                    discoveryLeadsMap.set(l.id, { ...l, source: 'discovery' });
                });

                const list = [
                    ...Array.from(discoveryLeadsMap.values()) as any[],
                    ...leads.map((l: any) => ({ ...l, source: 'lead' }))
                ];
                setLeadsList(list);

                if (queue.length > 0 && !selectedLead) {
                    setSelectedLead({ ...queue[0], source: 'discovery' });
                }
            } catch (error) {
                console.error("Error fetching leads for trainer:", error);
                toast.error("Error cargando prospectos.");
            }
        };
        fetchLeads();
    }, []);

    useEffect(() => {
        const fetchLastInteraction = async () => {
            if (!selectedLead) {
                setLastInteraction(null);
                return;
            }
            try {
                const param = selectedLead.source === 'discovery'
                    ? `discoveryLeadId=${selectedLead.id}`
                    : `contactId=${selectedLead.id}`;
                const res = await fetch(`/api/interactions?${param}&limit=1`);
                if (res.ok) {
                    const data = await res.json();
                    setLastInteraction(data[0] || null);
                }
            } catch (error) {
                console.error("Error fetching interaction:", error);
            }
        };
        fetchLastInteraction();
    }, [selectedLead]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                handleSaveRecording(blob);
            };

            // Set up simple VAD for talk ratio simulation
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
                updateTalkRatio();
            }, 1000);

            toast.success("Grabación iniciada");
        } catch (error) {
            toast.error("No se pudo acceder al micrófono");
        }
    };

    const updateTalkRatio = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((prev, curr) => prev + curr) / dataArray.length;

        // Simple logic: if volume > threshold, Closer is talking
        if (average > 30) {
            setTalkRatio(prev => Math.min(prev + 1, 90));
        } else {
            setTalkRatio(prev => Math.max(prev - 1, 10));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            toast.info("Grabación detenida. Procesando...");
        }
    };

    const handleSaveRecording = async (blob: Blob) => {
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'call.webm');
            if (selectedLead) {
                if (selectedLead.source === 'discovery') formData.append('discoveryLeadId', selectedLead.id);
                else formData.append('leadId', selectedLead.id);
            }

            const res = await fetch('/api/trainer/analyze', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setAnalysis(data.analysis);
                toast.success("Análisis completado");
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast.error("Error al analizar la llamada");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePrepareCall = async () => {
        if (!selectedLead) {
            toast.error("Selecciona un prospecto primero");
            return;
        }
        setIsPreparing(true);
        setPrepResult(null);
        try {
            const res = await fetch('/api/coach/prepare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: selectedLead.id,
                    entityType: selectedLead.source,
                    role: prepMode
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setPrepResult(data);
            toast.success("Estrategia generada");
        } catch (error) {
            toast.error("Error generando estrategia");
        } finally {
            setIsPreparing(false);
        }
    };

    const handleNextLead = () => {
        if (leadsList.length === 0) return;
        const currentIndex = leadsList.findIndex(l => l.id === selectedLead?.id);
        const nextIndex = (currentIndex + 1) % leadsList.length;
        setSelectedLead(leadsList[nextIndex]);
        setPrepResult(null);
        setCallNotes('');
    };

    const handleSaveCallResult = async () => {
        if (!selectedLead) return;
        setIsSavingResult(true);

        try {
            // 1. Save Interaction
            const interactionRes = await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'call',
                    direction: 'outbound',
                    outcome: callOutcome,
                    content: callNotes,
                    discoveryLeadId: selectedLead.source === 'discovery' ? selectedLead.id : null,
                    contactId: selectedLead.source === 'lead' ? selectedLead.id : null,
                    performedAt: new Date().toISOString()
                })
            });

            if (!interactionRes.ok) throw new Error("Error guardando interacción");

            // 2. Update Lead/Prospect Status
            const updateUrl = selectedLead.source === 'discovery'
                ? `/api/discovery/${selectedLead.id}`
                : `/api/leads/${selectedLead.id}`; // Assuming a similar endpoint exists for leads

            const updateRes = await fetch(updateUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columna1: selectedLead.source === 'discovery' ? callOutcome : undefined,
                    columna2: selectedLead.source === 'discovery' ? callAction : undefined,
                    status: selectedLead.source === 'lead' ? callOutcome : undefined // Simplification
                })
            });

            if (!updateRes.ok) throw new Error("Error actualizando estado del contacto");

            // 3. Handle 'Convertir a LEAD' Logic
            if (callAction === 'convertir_a_lead' && selectedLead.source === 'discovery') {

                // A. Smart Extraction (AI Profiler)
                let aiProfile = {};
                try {
                    // Only run AI if there are notes (at least 10 chars)
                    if (callNotes && callNotes.length > 10) {
                        toast.info("🧠 Analizando notas con IA...");
                        const extractRes = await fetch('/api/coach/extract-profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notes: callNotes })
                        });
                        if (extractRes.ok) {
                            aiProfile = await extractRes.json();
                            console.log("AI Profile Extracted:", aiProfile);
                            toast.success("Datos extraídos de tus notas ✨");
                        }
                    }
                } catch (e) {
                    console.error("Error extracting profile", e);
                }

                const extracted = aiProfile as any;

                const leadBody = {
                    businessName: selectedLead.businessName || "Sin Nombre",
                    contactName: selectedLead.razonSocialPropietario || selectedLead.representative || "Sin Nombre",
                    // Priority: Extracted Phone > Discovery Phone
                    phone: extracted?.phone || selectedLead.phone1 || selectedLead.phone2 || "",
                    email: extracted?.email || selectedLead.email || "",
                    city: selectedLead.city || "",
                    address: selectedLead.address || "",
                    businessType: selectedLead.businessType || "",

                    // Enriched Fields
                    personalityType: extracted?.personalityType || "",
                    communicationStyle: extracted?.communicationStyle || "",
                    ageRange: extracted?.ageRange || "", // Assuming schemas allow this or put in notes

                    source: 'trainer_conversion',
                    status: 'nuevo',
                    notes: `Lead convertido desde Trainer.\n\n📝 Notas Originales: ${callNotes}\n\n🧠 Análisis AI:\n- Personalidad: ${extracted?.personalityType || 'N/A'}\n- Estilo: ${extracted?.communicationStyle || 'N/A'}\n- Resumen: ${extracted?.summary || ''}\n\nOutcome: ${callOutcome}`,

                    // Map research data
                    pains: selectedLead.googleInfo ? `Review Data: ${selectedLead.googleInfo}` : "",
                };

                const createLeadRes = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(leadBody)
                });

                if (createLeadRes.ok) {
                    toast.success("🚀 ¡Lead convertido exitosamente!");
                } else {
                    console.error("Error converting lead", await createLeadRes.json());
                    toast.error("Error al convertir en Lead real (pero se guardó el resultado)");
                }
            } else {
                toast.success("Resultado guardado con éxito");
            }

            // Refresh interaction history
            const param = selectedLead.source === 'discovery'
                ? `discoveryLeadId=${selectedLead.id}`
                : `contactId=${selectedLead.id}`;
            const historyRes = await fetch(`/api/interactions?${param}&limit=1`);
            if (historyRes.ok) {
                const data = await historyRes.json();
                setLastInteraction(data[0] || null);
            }

            // Update leads list locally to reflect status changes
            setLeadsList(prev => prev.map(l => {
                if (l.id === selectedLead.id) {
                    return {
                        ...l,
                        columna1: selectedLead.source === 'discovery' ? callOutcome : l.columna1,
                        columna2: selectedLead.source === 'discovery' ? callAction : l.columna2,
                        status: selectedLead.source === 'lead' ? callOutcome : l.status
                    };
                }
                return l;
            }));

            // Optionally move to next lead
            // handleNextLead();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar el resultado");
        } finally {
            setIsSavingResult(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-8 max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">High Ticket Trainer</h1>
                        <p className="text-muted-foreground text-sm mt-2">Prepara tu mente antes de marcar.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="ghost"
                            className="px-4 py-2 hover:text-primary transition-all"
                            onClick={handleNextLead}
                        >
                            <ChevronRight className="mr-1 h-4 w-4" /> Siguiente en Cola
                        </Button>
                    </div>
                </div>

                {/* MAIN TRAINER LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN: CONTROL PANEL (4 units) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* STEP 1: LEAD SELECTOR */}
                        <Card className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardHeader className="p-6 py-4 border-b border-border/50">
                                <CardTitle className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-black">
                                    1. Selección de Prospecto
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <Select
                                    value={selectedLead?.id}
                                    onValueChange={(val) => {
                                        const lead = leadsList.find(l => l.id === val);
                                        setSelectedLead(lead);
                                        setPrepResult(null); // Clear previous prep
                                    }}
                                >
                                    <SelectTrigger className="w-full h-14 text-lg font-bold bg-background border-2 border-border/50 focus:border-primary transition-all rounded-xl">
                                        <SelectValue placeholder="Elegir lead para hoy..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[400px]">
                                        {leadsList.map((lead) => (
                                            <SelectItem key={lead.id} value={lead.id} className="py-3 px-4 border-b border-border/20 last:border-0 hover:bg-primary/5">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white leading-tight">
                                                            {lead.businessName || "Sin Nombre Comercial"}
                                                        </span>
                                                        {lead.source === 'discovery' && (
                                                            <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                                Discovery
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {lead.source === 'discovery' ? `${lead.province || ''}, ${lead.city || ''}` : lead.businessType}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedLead && (
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Contexto Actual</p>
                                            <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">
                                                {selectedLead.status === 'investigated' ? 'Investigado' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">
                                            {selectedLead.source === 'discovery'
                                                ? (selectedLead.razonSocialPropietario || selectedLead.representative || "Sin nombre registrado")
                                                : selectedLead.contactName}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            {selectedLead.bookingInfo && (
                                                <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[9px] px-1.5 font-bold">Booking</Badge>
                                            )}
                                            {selectedLead.googleInfo && (
                                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px] px-1.5 font-bold">Google Stars</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selectedLead && (
                                    <div className="space-y-2 mt-2">
                                        <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border group cursor-pointer hover:border-primary transition-colors"
                                            onClick={() => {
                                                const phone = selectedLead.phone || selectedLead.phone1;
                                                if (phone) {
                                                    navigator.clipboard.writeText(phone);
                                                    toast.success("Teléfono copiado");
                                                }
                                            }}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest">Teléfono Directo</p>
                                                <p className="font-bold text-xl text-primary">{selectedLead.phone || selectedLead.phone1 || 'Sin teléfono'}</p>
                                            </div>
                                            <Zap className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* STEP 2: TACTICAL MODE & ACTION */}
                        <Card className="rounded-2xl border text-card-foreground shadow-2xl border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3 px-6 pt-5">
                                <CardTitle className="text-xs uppercase tracking-widest text-primary font-bold">
                                    2. Enfoque de Llamada
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-6 pb-6 space-y-6">
                                <div className="grid grid-cols-4 gap-1 p-1 bg-background/50 rounded-lg border border-border/50">
                                    {[
                                        { id: 'asesor', emoji: '🧐', label: 'Asesor' },
                                        { id: 'consultor', emoji: '🧘', label: 'Consultor' },
                                        { id: 'vendedor', emoji: '⚡', label: 'Vendedor' },
                                        { id: 'contencion', emoji: '🛡️', label: 'Contención' }
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setPrepMode(mode.id)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-md transition-all",
                                                prepMode === mode.id
                                                    ? "bg-primary text-primary-foreground shadow-md"
                                                    : "text-muted-foreground hover:bg-accent"
                                            )}
                                        >
                                            <span className="text-lg mb-1">{mode.emoji}</span>
                                            <span className="text-[9px] font-black uppercase tracking-tighter">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    className="w-full h-16 text-xl font-black rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                                    onClick={handlePrepareCall}
                                    disabled={!selectedLead || isPreparing}
                                >
                                    {isPreparing ? "Procesando..." : "PREPARAR LLAMADA"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: AI PREPARATION & ACTION PANEL (8 units) */}
                    <div className="lg:col-span-8 space-y-6">
                        {!prepResult ? (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl text-muted-foreground bg-card/50">
                                <BrainCircuit className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-xl font-bold text-white/50">Esperando Frecuencia...</p>
                                <p className="text-sm text-center max-w-xs mt-2">
                                    Pulsa "Preparar Llamada" para generar tu pitch táctico.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                {prepResult.pitch === "SIN DATOS PARA CONTINUAR" ? (
                                    <div className="p-12 border-2 border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-4">
                                        <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                                            <Zap className="h-10 w-10 text-red-400" />
                                        </div>
                                        <h2 className="text-2xl font-black text-red-400 uppercase tracking-tighter">Sin datos suficientes</h2>
                                        <p className="text-muted-foreground max-w-sm mx-auto">
                                            Este prospecto no tiene información clara de Booking o Google. Salta este contacto para mantener el ritmo.
                                        </p>
                                        <Button variant="outline" onClick={handleNextLead} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                                            Siguiente en Cola
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* PITCH DE VENTA PERSONALIZADO */}
                                        <Card className="border-primary/30 shadow-2xl shadow-primary/10 bg-primary/5">
                                            <CardHeader className="pb-2 border-b border-border/50">
                                                <div className="flex justify-between items-center">
                                                    <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">
                                                        Pitch de Venta Personalizado
                                                    </CardTitle>
                                                    <Badge className="bg-primary/20 text-primary border-primary/30">
                                                        Modo {prepMode.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-6">
                                                <div
                                                    className="bg-card p-6 rounded-xl border border-border shadow-inner cursor-pointer hover:border-primary transition-all relative group"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(prepResult.pitch);
                                                        toast.success("Pitch copiado al portapapeles");
                                                    }}
                                                >
                                                    <p className="text-lg leading-relaxed text-white whitespace-pre-line">
                                                        {prepResult.pitch}
                                                    </p>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Badge variant="outline" className="text-[10px] uppercase">Click para copiar</Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* GRID DE DISPARADORES */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {prepResult.disparadores?.map((d: any, i: number) => (
                                                <Card key={i} className="border-indigo-500/20 bg-indigo-500/5">
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-[10px] uppercase font-black text-indigo-400">{d.titulo}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="flex flex-wrap gap-2">
                                                            {d.keywords.map((kw: string, j: number) => (
                                                                <Badge key={j} variant="secondary" className="bg-indigo-500/10 text-indigo-200 border-indigo-500/30 text-[9px]">
                                                                    {kw}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* ACTION PANEL */}
                                        <Card className="border-primary border-t-4 shadow-xl">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                    <ClipboardList className="h-5 w-5 text-primary" /> Resultado de la Llamada
                                                </CardTitle>
                                                <CardDescription>Documenta el resultado para perfilar al cliente.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">¿Qué pasó?</label>
                                                        <Select value={callOutcome} onValueChange={setCallOutcome}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Estado de contacto" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="contesto_interesado">✅ Contestó / Interesado</SelectItem>
                                                                <SelectItem value="contesto_no_interesado">🤝 Contestó / No Interesa hoy</SelectItem>
                                                                <SelectItem value="no_contesto">❌ No contestó</SelectItem>
                                                                <SelectItem value="buzon_voz">📠 Buzón de voz</SelectItem>
                                                                <SelectItem value="numero_invalido">⚠️ Número inválido</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Acción Siguiente</label>
                                                        <Select value={callAction} onValueChange={setCallAction}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Acción a tomar" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="convertir_a_lead">🚀 Convertir a LEAD</SelectItem>
                                                                <SelectItem value="seguimiento_7_dias">⏳ Seguimiento (7 días)</SelectItem>
                                                                <SelectItem value="seguimiento_30_dias">📅 Seguimiento (30 días)</SelectItem>
                                                                <SelectItem value="descartar">🗑️ Descartar</SelectItem>
                                                                <SelectItem value="pendiente">🔄 Mantener en cola</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notas de Perfilado</label>
                                                    <Textarea
                                                        placeholder="Siente que las OTAs le roban margen..."
                                                        className="min-h-[80px] bg-card border-border"
                                                        value={callNotes}
                                                        onChange={(e) => setCallNotes(e.target.value)}
                                                    />
                                                </div>

                                                <div className="flex gap-4">
                                                    <Button
                                                        className="flex-1 h-12 text-lg font-bold"
                                                        disabled={isSavingResult || !selectedLead}
                                                        onClick={handleSaveCallResult}
                                                    >
                                                        {isSavingResult ? 'Guardando...' : 'Guardar Resultado'}
                                                        <Save className="ml-2 h-5 w-5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-12 px-6"
                                                        onClick={handleNextLead}
                                                    >
                                                        Saltar
                                                        <ChevronRight className="ml-2 h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

