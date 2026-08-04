"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Target, Layers } from "lucide-react";
import { toast } from "sonner";

export interface Campaign {
  id: string;
  nombre: string;
  fuenteTipo: string;
  ciudad?: string;
  canton?: string;
  categoriaBusqueda?: string;
  totalProspectos: number;
  totalLlamadas: number;
  totalConvertidos: number;
  estado: string;
  scriptId?: string;
}

interface CampaignSelectorProps {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  onSelectCampaign: (id: string) => void;
  onCampaignCreated: () => void;
}

export function CampaignSelector({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onCampaignCreated
}: CampaignSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("Quito");
  const [categoriaBusqueda, setCategoriaBusqueda] = useState("Imprentas");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          ciudad,
          categoriaBusqueda,
          fuenteTipo: "scraper_google"
        })
      });

      if (!res.ok) throw new Error("Error al crear campaña");
      
      const created = await res.json();
      toast.success("Campaña creada exitosamente");
      setOpen(false);
      setNombre("");
      onCampaignCreated();
      onSelectCampaign(created.id);
    } catch (err) {
      toast.error("No se pudo crear la campaña");
    } finally {
      setLoading(false);
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-card border shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          <span>Campaña Activa</span>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span>Nueva</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nueva Campaña de Adquisición</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Campaña</Label>
                <Input
                  id="nombre"
                  placeholder="ej. Imprentas Cayambe Agosto 2026"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría Target</Label>
                  <Input
                    id="categoria"
                    value={categoriaBusqueda}
                    onChange={(e) => setCategoriaBusqueda(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creando..." : "Crear Campaña"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Select value={selectedCampaignId || ""} onValueChange={onSelectCampaign}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Selecciona una campaña..." />
        </SelectTrigger>

        <SelectContent>
          {campaigns.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="font-medium truncate">{c.nombre}</span>
                <span className="text-xs text-muted-foreground">({c.totalProspectos} leads)</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCampaign && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
          <div className="bg-muted/40 p-1.5 rounded">
            <div className="font-bold text-foreground">{selectedCampaign.totalProspectos}</div>
            <div className="text-muted-foreground">Prospectos</div>
          </div>
          <div className="bg-muted/40 p-1.5 rounded">
            <div className="font-bold text-foreground">{selectedCampaign.totalLlamadas}</div>
            <div className="text-muted-foreground">Llamadas</div>
          </div>
          <div className="bg-muted/40 p-1.5 rounded">
            <div className="font-bold text-foreground">{selectedCampaign.totalConvertidos}</div>
            <div className="text-muted-foreground">Ventas</div>
          </div>
        </div>
      )}
    </div>
  );
}
