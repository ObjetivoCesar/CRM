
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BriefingData {
    summary: string;
    closerStrategy: {
        frameControl: string;
        emotionalExploration: string[];
        amplification: string;
        gapAnalysis: string;
        quietAuthority: string;
        invitation: string;
    };
    talkingPoints: string[];
    objections: { ob: string; res: string }[];
    iceBreakers: string[];
}

interface MeetingBriefingCardProps {
    meetingId: string;
    agentId?: string; // Optional, if linked to a specific agent context
}

export function MeetingBriefingCard({ meetingId, agentId }: MeetingBriefingCardProps) {
    const [loading, setLoading] = useState(true);
    const [briefing, setBriefing] = useState<BriefingData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Real fetch for Donna Briefing (Phase 5)
    useEffect(() => {
        const fetchBriefing = async () => {
            setLoading(true);
            try {
                // We use the meetingId as the triggering ID, but we fetch the strategy for the contact
                const response = await fetch(`/api/donna/briefing/${meetingId}`);
                const data = await response.json();

                if (data.success && data.briefing) {
                    setBriefing(data.briefing);
                } else {
                    setError("No se pudo generar el briefing estratégico.");
                }
            } catch (err) {
                console.error("Donna Briefing Fetch Error:", err);
                setError("Error al conectar con el sistema Donna.");
            } finally {
                setLoading(false);
            }
        };

        if (meetingId) {
            fetchBriefing();
        }
    }, [meetingId]);

    if (loading) {
        return (
            <Card className="w-full border-indigo-500/30 bg-indigo-500/5 backdrop-blur-sm">
                <CardContent className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    <span className="ml-3 text-sm text-indigo-300 font-medium">
                        Donna está analizando el caso...
                    </span>
                </CardContent>
            </Card>
        );
    }

    if (error || !briefing) {
        return null; // Or show error state
    }

    return (
        <Card className="w-full border-l-4 border-l-indigo-500 bg-gray-900/40 backdrop-blur-md shadow-xl border-t border-r border-b border-white/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center text-xl font-bold text-white">
                            <Sparkles className="mr-2 h-5 w-5 text-indigo-400" />
                            Donna Briefing: Preparación de Reunión
                        </CardTitle>
                        <CardDescription className="text-indigo-200/60 font-medium">Análisis estratégico en tiempo real</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                        Donna v1.2 Active
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="closer" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 p-1">
                        <TabsTrigger value="closer" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">ADN Closer</TabsTrigger>
                        <TabsTrigger value="summary">Resumen</TabsTrigger>
                        <TabsTrigger value="strategy">Táctica</TabsTrigger>
                        <TabsTrigger value="scripts">Manejo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="closer" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Phase 1: Frame Control */}
                            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Fase 1: Frame Control</h4>
                                <p className="text-sm text-indigo-100 font-medium leading-relaxed italic">"{briefing.closerStrategy.frameControl}"</p>
                            </div>

                            {/* Phase 4: Gap Analysis */}
                            <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 backdrop-blur-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Fase 4: El Gap (La Brecha)</h4>
                                <p className="text-sm text-orange-100 font-medium leading-relaxed">{briefing.closerStrategy.gapAnalysis}</p>
                            </div>
                        </div>

                        {/* Phase 2: Emotional Exploration */}
                        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fase 2: Exploración Emocional (Dolor)</h4>
                            <div className="space-y-2">
                                {briefing.closerStrategy.emotionalExploration.map((q, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
                                        <p className="text-sm text-gray-300 italic font-medium">"{q}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Phase 3: Amplificación */}
                            <div className="p-4 rounded-xl border border-white/10 bg-white/5 md:col-span-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Fase 3: Amplificación</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">{briefing.closerStrategy.amplification}</p>
                            </div>
                            {/* Phase 5: Autoridad */}
                            <div className="p-4 rounded-xl border border-white/10 bg-white/5 md:col-span-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Fase 5: Autoridad</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">{briefing.closerStrategy.quietAuthority}</p>
                            </div>
                            {/* Phase 6: Invitación */}
                            <div className="p-4 rounded-xl border border-indigo-500/50 bg-indigo-600/20 md:col-span-1 animate-pulse">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Fase 6: La Invitación</h4>
                                <p className="text-sm text-white font-bold italic leading-relaxed">"{briefing.closerStrategy.invitation}"</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="summary" className="mt-4 space-y-4">
                        <div className="rounded-md bg-white/5 p-4 border border-white/10">
                            <h4 className="font-semibold text-indigo-300 mb-2">Contexto Clave</h4>
                            <p className="text-sm text-gray-300 leading-relaxed">{briefing.summary}</p>
                        </div>
                        <div className="rounded-md bg-indigo-500/10 p-4 border border-indigo-500/20">
                            <h4 className="font-semibold text-indigo-200 mb-2 flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" /> Rompehielos
                            </h4>
                            <ul className="list-disc pl-5 space-y-1">
                                {briefing.iceBreakers.map((item, i) => (
                                    <li key={i} className="text-sm text-indigo-100/80">{item}</li>
                                ))}
                            </ul>
                        </div>
                    </TabsContent>

                    <TabsContent value="strategy" className="mt-4 space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Puntos de Valor Estratégico</h4>
                            <ul className="space-y-2">
                                {briefing.talkingPoints.map((point, i) => (
                                    <li key={i} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-2 shrink-0" />
                                        <span className="text-sm text-gray-300">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </TabsContent>

                    <TabsContent value="scripts" className="mt-4">
                        <div className="space-y-3">
                            {briefing.objections.map((obj, i) => (
                                <div key={i} className="border border-red-100 bg-red-50/50 rounded-lg p-3">
                                    <div className="flex items-center text-red-700 font-medium text-sm mb-1">
                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                        Si dicen: "{obj.ob}"
                                    </div>
                                    <div className="text-sm text-gray-700 pl-6">
                                        Responde: "{obj.res}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
