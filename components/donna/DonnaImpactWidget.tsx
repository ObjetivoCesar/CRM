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
        <Card className="clean-card animate-pulse">
            <CardContent className="h-16 flex items-center justify-center text-muted-foreground text-sm">
                Donna está escaneando tus compromisos...
            </CardContent>
        </Card>
    );

    const criticalCount = commitments.filter(c => c.severity === 'high').length;

    if (commitments.length === 0) {
        return (
            <Card className="clean-card border-emerald-200 bg-emerald-50/50">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <CardTitle className="text-base font-semibold text-emerald-800">Donna — Todo en orden</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-emerald-700">
                        No tienes compromisos pendientes. Donna está vigilando tu CRM.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="clean-card">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#1a2236] flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-[#c8a84e]" />
                        </div>
                        <CardTitle className="text-base font-semibold">Donna — Compromisos Activos</CardTitle>
                    </div>
                    {criticalCount > 0 && (
                        <Badge variant="destructive" className="text-xs flex gap-1">
                            <AlertTriangle className="w-3 h-3" /> {criticalCount}
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-sm">
                    "César, no olvides estos compromisos."
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2">
                {commitments.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.severity === 'high' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                <p className="text-sm font-medium truncate">{c.title}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 ml-[14px]">
                                <Clock className="w-3 h-3" />
                                <span>{formatDistanceToNow(new Date(c.dueDate), { addSuffix: true, locale: es })}</span>
                                <span>·</span>
                                <span className="truncate max-w-[120px]">{c.businessName || c.contactName}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-2 text-muted-foreground hover:text-[#c8a84e]" asChild>
                            <Link href={`/clients/${c.contactId}`}>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>
                ))}

                {commitments.length > 3 && (
                    <Link href="/donna" className="block text-center text-xs text-[#c8a84e] font-medium hover:underline pt-1">
                        + {commitments.length - 3} compromisos más
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
