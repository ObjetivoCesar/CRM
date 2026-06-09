import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Share2, Download, Send } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    messageTimestamp: string;
    platform: string;
}

interface ExportChatDialogProps {
    contactId: string;
    messages: Message[];
}

export function ExportChatDialog({ contactId, messages }: ExportChatDialogProps) {
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState('');
    const [sending, setSending] = useState(false);
    const { toast } = useToast();

    const handleSendWhatsApp = async () => {
        if (!phone.trim()) {
            toast({ title: "Error", description: "Ingresa un número de teléfono.", variant: "destructive" });
            return;
        }
        
        setSending(true);
        try {
            const res = await fetch(`/api/conversations/${contactId}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPhone: phone })
            });

            if (res.ok) {
                toast({ title: "Exportación Exitosa", description: "El chat ha sido enviado por WhatsApp." });
                setOpen(false);
                setPhone('');
            } else {
                throw new Error("Failed to export");
            }
        } catch (error) {
            toast({ title: "Error", description: "No se pudo exportar el chat.", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const handleDownload = () => {
        if (messages.length === 0) {
            toast({ title: "Aviso", description: "No hay mensajes para exportar." });
            return;
        }

        const formatted = messages.map(msg => {
            let dateStr = '';
            try {
                dateStr = format(new Date(msg.messageTimestamp), 'yyyy-MM-dd HH:mm:ss', { locale: es });
            } catch (e) {
                dateStr = msg.messageTimestamp;
            }
            const roleStr = msg.role === 'user' ? 'Cliente' : msg.role === 'assistant' ? 'Ale (AI)' : 'Sistema';
            return `[${dateStr}] ${roleStr}: ${msg.content || '(Archivo/Media)'}`;
        }).join('\n');

        const blob = new Blob([`📋 Historial de Chat\n\n${formatted}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_export_${contactId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-600 hover:text-slate-900">
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Exportar</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Exportar Conversación</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Enviar por WhatsApp</h4>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ej: 593987654321"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                            <Button onClick={handleSendWhatsApp} disabled={sending || !phone.trim()}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Ingresa el número con código de país (ej. 593) al que se enviará el historial como mensaje de texto.
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">o</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Descargar archivo local</h4>
                        <Button variant="outline" className="w-full gap-2" onClick={handleDownload}>
                            <Download className="h-4 w-4" />
                            Descargar como .txt
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
