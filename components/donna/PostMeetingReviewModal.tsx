
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, User, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommitmentDraft {
    id: string; // Temporary ID for draft
    title: string;
    description?: string;
    assignee: string;
    role: 'client' | 'internal_team' | 'cesar' | 'strategic_cue';
    dueDate: Date | null;
    severity: 'low' | 'medium' | 'high';
}

interface PostMeetingReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    meetingId: string;
    notes?: string;
}

export function PostMeetingReviewModal({ isOpen, onClose, meetingId, notes }: PostMeetingReviewModalProps) {
    const [drafts, setDrafts] = useState<CommitmentDraft[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // AI Extraction Flow
    useEffect(() => {
        if (isOpen && notes && notes.trim().length > 10) {
            handleAIExtraction();
        }
    }, [isOpen, notes]);

    const handleAIExtraction = async () => {
        setIsExtracting(true);
        try {
            const response = await fetch('/api/donna/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });
            const data = await response.json();

            if (data.success && data.drafts) {
                // Map API drafts to UI state
                const mappedDrafts = data.drafts.map((d: any, idx: number) => ({
                    id: `draft-${idx}`,
                    title: d.title,
                    description: d.description,
                    assignee: d.assigneeName,
                    role: d.actorRole,
                    dueDate: d.dueDate ? new Date(d.dueDate) : null,
                    severity: d.severity
                }));
                setDrafts(mappedDrafts);
            } else {
                toast.error("Donna no pudo detectar compromisos claros.");
            }
        } catch (error) {
            console.error("AI Error:", error);
            toast.error("Error al conectar con Donna.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        // TODO: Call CommitmentService.activateCommitment() for each draft
        setTimeout(() => {
            setIsLoading(false);
            toast.success("Compromisos guardados y activados correctamente.");
            onClose();
        }, 1000);
    };

    const removeDraft = (id: string) => {
        setDrafts(drafts.filter(d => d.id !== id));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-gray-950 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-xl text-white">
                        <CheckCircle className="mr-2 h-6 w-6 text-emerald-500" />
                        Donna: Revisión de Acuerdos Post-Reunión
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {isExtracting ? "Donna está analizando tus notas..." : "Donna ha detectado estos compromisos. Por favor valida antes de guardar."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
                    {isExtracting && (
                        <div className="flex flex-col items-center justify-center py-10 text-indigo-400">
                            <Loader2 className="h-10 w-10 animate-spin mb-3" />
                            <p className="text-sm font-medium">Extrayendo compromisos...</p>
                        </div>
                    )}

                    {!isExtracting && drafts.map((draft) => (
                        <div key={draft.id} className={cn(
                            "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
                            draft.role === 'strategic_cue'
                                ? "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                        )}>
                            <div className="flex items-start justify-between">
                                <Input
                                    defaultValue={draft.title}
                                    className="font-medium text-base bg-transparent border-transparent hover:border-white/20 focus:border-indigo-500 text-white w-full mr-2"
                                />
                                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-400" onClick={() => removeDraft(draft.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-1/3">
                                    <Label className="text-xs text-gray-400 mb-1 block">Responsable</Label>
                                    <Select defaultValue={draft.role}>
                                        <SelectTrigger className="h-8 bg-gray-900 border-white/10 text-xs text-white">
                                            <div className="flex items-center">
                                                <User className="h-3 w-3 mr-2 text-indigo-400" />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-900 border-white/10 text-white">
                                            <SelectItem value="client">Cliente</SelectItem>
                                            <SelectItem value="internal_team">Equipo</SelectItem>
                                            <SelectItem value="cesar">Yo (César)</SelectItem>
                                            <SelectItem value="strategic_cue">💡 Cue Estratégico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-1/3">
                                    <Label className="text-xs text-gray-400 mb-1 block">Fecha Límite</Label>
                                    <Button variant="outline" className="h-8 w-full justify-start text-left font-normal bg-gray-900 border-white/10 text-xs text-white">
                                        <CalendarIcon className="mr-2 h-3 w-3 opacity-50" />
                                        {draft.dueDate ? format(draft.dueDate, "PPP") : "Sin fecha (Cue)"}
                                    </Button>
                                </div>

                                <div className="w-1/3">
                                    <Label className="text-xs text-gray-400 mb-1 block">Impacto</Label>
                                    <Select defaultValue={draft.severity}>
                                        <SelectTrigger className="h-8 bg-gray-900 border-white/10 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-900 border-white/10 text-white">
                                            <SelectItem value="low">Bajo (Info)</SelectItem>
                                            <SelectItem value="medium">Medio (Warning)</SelectItem>
                                            <SelectItem value="high">Alto (Critical)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    ))}

                    <Button variant="outline" className="w-full border-dashed border-white/20 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/50 bg-transparent">
                        + Agregar Compromiso Manual
                    </Button>
                </div>

                <DialogFooter className="sm:justify-between items-center mt-4 border-t border-white/10 pt-4">
                    <div className="text-sm text-gray-500 font-mono">
                        {drafts.length} DETECTADOS BY DONNA
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancelar</Button>
                        <Button onClick={handleConfirm} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
                            {isLoading ? "Validando..." : "Confirmar y Activar"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
