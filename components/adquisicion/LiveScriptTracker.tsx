"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ScriptStep {
  orden: number;
  gatillo: string;
  frase: string;
  objetivo?: string;
  keywords?: string;
}

interface LiveScriptTrackerProps {
  steps: ScriptStep[];
  activeStepIndex: number;
  completedSteps: number[];
  onStepClick: (index: number) => void;
  onReset: () => void;
}

export function LiveScriptTracker({
  steps,
  activeStepIndex,
  completedSteps,
  onStepClick,
  onReset
}: LiveScriptTrackerProps) {
  if (!steps || steps.length === 0) {
    return (
      <Card className="h-full border-dashed flex items-center justify-center p-6 text-center text-muted-foreground">
        Cargando guion de ventas...
      </Card>
    );
  }

  const activeStep = steps[activeStepIndex] || steps[0];

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
          <span className="font-semibold text-sm">Guion en Vivo</span>
          <Badge variant="outline" className="text-xs">
            Paso {activeStepIndex + 1} de {steps.length}
          </Badge>
        </div>

        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={onReset}>
          <RefreshCw className="h-3 w-3" />
          Reiniciar
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIndex;
          const isCompleted = completedSteps.includes(step.orden);

          return (
            <Card
              key={step.orden || idx}
              onClick={() => onStepClick(idx)}
              className={`cursor-pointer transition-all duration-200 border ${
                isActive
                  ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                  : isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                  : "border-border/50 opacity-60 hover:opacity-100"
              }`}
            >
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {step.gatillo}
                  </span>

                  {step.objetivo && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                      {step.objetivo}
                    </span>
                  )}
                </div>

                <p className={`text-xs leading-relaxed font-mono ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {step.frase}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
