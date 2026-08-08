"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CampaignSelector, Campaign } from "@/components/adquisicion/CampaignSelector";
import { LiveScriptTracker, ScriptStep } from "@/components/adquisicion/LiveScriptTracker";
import { PitchAuditorWidget } from "@/components/adquisicion/PitchAuditorWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Search, ExternalLink, RefreshCw, UserCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AdquisicionPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [leadsSource, setLeadsSource] = useState<'leads' | 'discovery'>('discovery');

  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCampaigns = async () => {
    try {
      const res = await fetch("/api/v1/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        // Si no hay campaña seleccionada y hay disponibles, usar la primera
        if (data.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(data[0].id);
        }
      }
    } catch (e) {
      toast.error("Error al cargar campañas");
    }
  };

  const loadScripts = async () => {
    try {
      const res = await fetch("/api/v1/scripts?activo=true");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0 && Array.isArray(data[0].pasos)) {
          setSteps(data[0].pasos);
        }
      }
    } catch (e) {
      console.error("Error cargando guion", e);
    }
  };

  const loadLeads = async () => {
    try {
      if (leadsSource === 'discovery') {
        // Fuente: discovery_leads WHERE columna2='en_cola' (los que añadiste con 📋)
        const res = await fetch("/api/v1/leads/queue-discovery");
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
        } else {
          toast.error("Error al cargar cola de Discovery");
        }
      } else {
        // Fuente: contacts WHERE entityType='lead' (legacy)
        const res = await fetch("/api/leads");
        if (res.ok) {
          const data = await res.json();
          setLeads(data);
        } else {
          toast.error("Error al cargar prospectos");
        }
      }
    } catch (e) {
      toast.error("Error al cargar prospectos");
    }
  };

  useEffect(() => {
    loadCampaigns();
    loadScripts();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [leadsSource]);

  // Crear campaña rápida (sin scraping, sin script) para empezar a llamar ya
  const createQuickCampaign = async () => {
    try {
      const nombre = `Llamadas ${new Date().toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })}`;
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          fuenteTipo: "referido",
          descripcion: "Campaña rápida para llamadas manuales con leads de Discovery",
        }),
      });
      if (!res.ok) throw new Error("No se pudo crear");
      const created = await res.json();
      toast.success(`✅ Campaña "${nombre}" lista`);
      await loadCampaigns();
      setSelectedCampaignId(created.id);
    } catch (err) {
      toast.error("Error creando campaña rápida");
    }
  };

  const filteredLeads = leads.filter((l) =>
    l.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone?.includes(searchQuery)
  );

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col gap-4 p-2 md:p-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 h-full overflow-hidden">
          {/* Panel Izquierdo: Selección de Campaña y Lista de Prospectos */}
          <div className="md:col-span-4 flex flex-col gap-3 h-full overflow-hidden">
            <CampaignSelector
              campaigns={campaigns}
              selectedCampaignId={selectedCampaignId}
              onSelectCampaign={setSelectedCampaignId}
              onCampaignCreated={loadCampaigns}
            />

            {/* Quick campaign button */}
            <Button
              variant="outline"
              size="sm"
              onClick={createQuickCampaign}
              className="h-8 text-[11px] font-bold border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            >
              ⚡ Campaña Rápida (Discovery)
            </Button>

            <Card className="flex-1 flex flex-col overflow-hidden border shadow-sm">
              <CardHeader className="py-2.5 px-3 border-b flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xs font-semibold">Prospectos</CardTitle>
                  {/* Source toggle */}
                  <div className="flex bg-muted/30 rounded-md p-0.5 text-[10px]">
                    <button
                      onClick={() => setLeadsSource('discovery')}
                      className={`px-2 py-0.5 rounded ${leadsSource === 'discovery' ? 'bg-emerald-600 text-white font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      🟢 Cola Discovery
                    </button>
                    <button
                      onClick={() => setLeadsSource('leads')}
                      className={`px-2 py-0.5 rounded ${leadsSource === 'leads' ? 'bg-blue-600 text-white font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      🔵 Contacts
                    </button>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={loadLeads}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </CardHeader>

              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar negocio o teléfono..."
                    className="pl-8 h-8 text-xs bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <CardContent className="p-2 flex-1 overflow-y-auto space-y-1.5">
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No hay prospectos en esta lista
                  </div>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "hover:bg-muted/50 border-border/60"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span className="truncate max-w-[180px]">{lead.businessName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {lead.city || "Quito"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground pt-1 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" />
                            {lead.phone || "Sin teléfono"}
                          </span>
                          <span className="capitalize">{lead.status || "pendiente"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel Central: Guion en Vivo */}
          <div className="md:col-span-5 h-full overflow-hidden flex flex-col">
            <LiveScriptTracker
              steps={steps}
              activeStepIndex={activeStepIndex}
              completedSteps={completedSteps}
              onStepClick={(idx) => {
                setActiveStepIndex(idx);
                if (!completedSteps.includes(steps[idx]?.orden)) {
                  setCompletedSteps([...completedSteps, steps[idx]?.orden]);
                }
              }}
              onReset={() => {
                setActiveStepIndex(0);
                setCompletedSteps([]);
              }}
            />
          </div>

          {/* Panel Derecho: Pitch Auditor */}
          <div className="md:col-span-3 h-full overflow-hidden flex flex-col">
            <PitchAuditorWidget
              campaignId={selectedCampaignId || "default"}
              contactId={selectedLead?.id || null}
              onEvaluationComplete={() => loadLeads()}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
