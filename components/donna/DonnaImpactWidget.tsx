"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, Clock, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Commitment {
    id: string;
    title: string;
    description: string;
    status: string;
    dueDate: string;
    severity: 'low' | 'medium' | 'high';
    contactName: string;
    businessName: string;
    contactId: string;
}

export function DonnaImpactWidget() {
    const [commitments, setCommitments] = useState<Commitment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCommitments = async () => {
            try {
                const response = await fetch('/api/donna/commitments/active');
                const data = await response.json();
                if (data.success) {
                    setCommitments(data.commitments);
                }
            } catch (error) {
                console.error("Error fetching Donna commitments:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCommitments();
    }, []);

    if (loading) return (
        <Card className="border-dashed border shadow-none bg-muted/5 animate-pulse">
            <CardContent className="h-24 flex items-center justify-center text-muted-foreground text-sm font-medium">
                Donna está escaneando tus compromisos...
            </CardContent>
        </Card>
    );

    const criticalCount = commitments.filter(c => c.severity === 'high').length;

    // Empty State - Donna is watching but everything is fine
    if (commitments.length === 0) {
        return (
            <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm overflow-hidden relative group border-2">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-500 p-1.5 rounded-lg">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <CardTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Donna: Confiabilidad al 100%</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium italic">
                        "César, no tienes compromisos pendientes o críticos por ahora. Donna está vigilando tu CRM."
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-lg overflow-hidden relative group border-2">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <Sparkles className="w-24 h-24 text-indigo-500" />
            </div>

            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-500 p-1.5 rounded-lg shadow-indigo-500/50 shadow-sm">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <CardTitle className="text-lg font-bold text-indigo-900 dark:text-indigo-100 italic">Mando de Control: Donna</CardTitle>
                    </div>
                    {criticalCount > 0 && (
                        <Badge variant="destructive" className="animate-pulse flex gap-1">
                            <AlertTriangle className="w-3 h-3" /> {criticalCount} CRÍTICOS
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-indigo-700/70 dark:text-indigo-400/70 font-medium italic">
                    "César, no olvides estos compromisos. Tu reputación depende de ellos."
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                {commitments.slice(0, 3).map((c) => (
                    <div key={c.id} className="bg-white/70 dark:bg-gray-900/70 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-xl flex items-center justify-between hover:border-indigo-400 transition-all shadow-sm relative z-10">
                        <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${c.severity === 'high' ? 'bg-red-500' : 'bg-indigo-400'}`} />
                                <p className="font-bold text-sm leading-tight text-gray-800 dark:text-gray-200">
                                    {c.title}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(c.dueDate), { addSuffix: true, locale: es })}
                                </span>
                                <span className="text-gray-400">|</span>
                                <span className="font-semibold uppercase truncate max-w-[120px]">
                                    {c.businessName || c.contactName}
                                </span>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600" asChild>
                            <Link href={`/clients/${c.contactId}`}>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>
                ))}

                {commitments.length > 3 && (
                    <Link href="/donna" className="block text-center text-xs text-indigo-500 font-bold hover:underline py-1 relative z-10">
                        + Ver otros {commitments.length - 3} compromisos detectados
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
