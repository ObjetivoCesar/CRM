"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mic, User, CheckCircle, Sparkles, Telescope, BarChart2, Handshake, FileText, Home } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { MultiProductSelector } from "./multi-product-selector"
import { getProducts } from "@/app/actions/product-actions"

interface LeadCaptureFormProps {
  leadId?: string | null
  onBack: () => void
}

const sectionIcons: { [key: number]: React.ElementType } = {
  1: User,
  2: Telescope,
  3: BarChart2,
  4: Handshake,
  5: FileText,
  6: Sparkles,
}

export function LeadCaptureForm({ leadId, onBack }: LeadCaptureFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [animation, setAnimation] = useState("animate-slide-in-right")
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribingField, setTranscribingField] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    async function loadProducts() {
      const result = await getProducts();
      if (result.success && result.data) {
        setProducts(result.data);
      }
    }
    loadProducts();
  }, [])


  const [formData, setFormData] = useState({
    // Step 1
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    businessLocation: "",
    businessActivity: "",
    relationshipType: "",
    // Step 2
    interestedProduct: [] as string[], // Changed to array for multi-select
    pains: "", // New: Dolores
    goals: "", // New: Metas
    objections: "", // New: Objeciones
    quantifiedProblem: "",
    conservativeGoal: "",
    verbalAgreements: "",
    // Step 3
    yearsInBusiness: "",
    numberOfEmployees: "",
    numberOfBranches: "",
    currentClientsPerMonth: "",
    averageTicket: "",
    knownCompetition: "",
    highSeason: "",
    criticalDates: "",
    facebookFollowers: "",
    otherAchievements: "",
    specificRecognitions: "",
    // Step 4
    personalityType: "",
    communicationStyle: "",
    keyPhrases: "",
    strengths: "",
    weaknesses: "",
    opportunities: "",
    threats: "",
  })

  useEffect(() => {
    if (leadId) {
      const fetchLeadData = async () => {
        try {
          const response = await fetch(`/api/leads/${leadId}`)
          if (response.ok) {
            const data = await response.json()
            setFormData({
              businessName: data.businessName || "",
              contactName: data.contactName || "",
              phone: data.phone || "",
              email: data.email || "",
              address: data.address || "",
              businessLocation: data.businessLocation || "",
              businessActivity: data.businessActivity || "",
              relationshipType: data.relationshipType || "",
              interestedProduct: Array.isArray(data.interestedProduct)
                ? data.interestedProduct
                : (typeof data.interestedProduct === 'string' && data.interestedProduct.length > 0
                  ? data.interestedProduct.split(',').map((s: string) => s.trim())
                  : []),
              pains: data.pains || "",
              goals: data.goals || "",
              objections: data.objections || "",
              quantifiedProblem: data.quantifiedProblem || "",
              conservativeGoal: data.conservativeGoal || "",
              verbalAgreements: data.verbalAgreements || "",
              yearsInBusiness: data.yearsInBusiness?.toString() || "",
              numberOfEmployees: data.numberOfEmployees?.toString() || "",
              numberOfBranches: data.numberOfBranches?.toString() || "",
              currentClientsPerMonth: data.currentClientsPerMonth?.toString() || "",
              averageTicket: data.averageTicket?.toString() || "",
              knownCompetition: data.knownCompetition || "",
              highSeason: data.highSeason || "",
              criticalDates: data.criticalDates || "",
              facebookFollowers: data.facebookFollowers?.toString() || "",
              otherAchievements: data.otherAchievements || "",
              specificRecognitions: data.specificRecognitions || "",
              personalityType: data.personalityType || "",
              communicationStyle: data.communicationStyle || "",
              keyPhrases: data.keyPhrases || "",
              strengths: data.strengths || "",
              weaknesses: data.weaknesses || "",
              opportunities: data.opportunities || "",
              threats: data.threats || "",
            })
          } else {
            alert("Error al cargar los datos del lead.")
          }
        } catch (error) {
          alert("Error al cargar los datos del lead.")
        }
      }
      fetchLeadData()
    }
  }, [leadId])

  const steps = [
    { id: 1, title: "Información Fundamental" },
    { id: 2, title: "Perfilado y Necesidades" }, // Updated title
    { id: 3, title: "Contexto y Rendimiento" },
    { id: 4, title: "Perfil y Análisis Estratégico" },
    { id: 5, title: "Revisión" },
    { id: 6, title: "Éxito" },
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setAnimation("animate-slide-out-left")
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setAnimation("animate-slide-in-right")
      }, 400)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setAnimation("animate-slide-out-left")
      setTimeout(() => {
        setCurrentStep(currentStep - 1)
        setAnimation("animate-slide-in-right")
      }, 400)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value as string }));
  };

  const startRecording = async (field: string) => {
    if (isRecording) {
      mediaRecorder?.stop()
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" })
        await transcribeAudio(blob, field)
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      alert("No se pudo acceder al micrófono. Verifica los permisos.")
    }
  }

  const transcribeAudio = async (audioBlob: Blob, field: string) => {
    setTranscribingField(field)
    setIsTranscribing(true)
    try {
      const formDataToSubmit = new FormData()
      formDataToSubmit.append("audio", audioBlob, "recording.wav")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formDataToSubmit,
      })

      if (response.ok) {
        const { transcription } = await response.json()
        const currentValue = formData[field as keyof typeof formData]
        const newValue = Array.isArray(currentValue) ? currentValue.join(', ') : currentValue;
        const updatedValue = newValue ? `${newValue}\n${transcription}` : transcription
        handleInputChange(field, updatedValue)
      } else {
        alert("Error al transcribir el audio.")
      }
    } catch (error) {
      alert("Error al transcribir el audio.")
    } finally {
      setIsTranscribing(false)
      setTranscribingField(null)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const url = leadId ? `/api/leads/${leadId}` : '/api/leads';
      const method = leadId ? 'PUT' : 'POST';

      // Prepare data for submission - convert array to string for text column
      const submissionData = {
        ...formData,
        interestedProduct: Array.isArray(formData.interestedProduct)
          ? formData.interestedProduct.join(', ') // Convert ["Prod A", "Prod B"] to "Prod A, Prod B"
          : formData.interestedProduct
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        handleNext(); // Move to success step
      } else {
        const errorData = await response.json();
        alert(`Error al ${leadId ? 'actualizar' : 'crear'} el lead: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ocurrió un error al enviar el formulario. Revisa la consola para más detalles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (fieldName: keyof typeof formData, label: string, type: string = "text") => (
    <div className="relative form-field mb-6">
      <Input
        id={fieldName}
        type={type}
        value={formData[fieldName] as string}
        onChange={(e) => handleInputChange(fieldName, e.target.value)}
        placeholder=" "
        className="peer form-input w-full p-4 border-2 border-[#e8e6e3] rounded-xl text-base bg-blue-50 text-gray-900 transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(255,107,53,0.2)] focus:-translate-y-0.5"
      />
      <label htmlFor={fieldName} className="form-label absolute top-4 left-5 text-muted-foreground transition-all duration-300 pointer-events-none peer-focus:top-[-10px] peer-focus:left-4 peer-focus:scale-90 peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
        {label}
      </label>
    </div>
  )

  const renderTextarea = (fieldName: keyof typeof formData, label: string) => (
    <div className="relative form-field mb-6">
      <Textarea
        id={fieldName}
        value={formData[fieldName] as string}
        onChange={(e) => handleInputChange(fieldName, e.target.value)}
        placeholder=" "
        className="peer form-input w-full p-4 border-2 border-[#e8e6e3] rounded-xl text-base bg-blue-50 text-gray-900 transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(255,107,53,0.2)] min-h-[120px] resize-none pr-12"
      />
      <label htmlFor={fieldName} className="form-label absolute top-4 left-5 text-muted-foreground transition-all duration-300 pointer-events-none peer-focus:top-[-10px] peer-focus:left-4 peer-focus:scale-90 peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
        {label}
      </label>
      <Button type="button" size="icon" onClick={() => startRecording(fieldName)} disabled={isTranscribing && transcribingField !== fieldName} className={cn("absolute top-3 right-3 w-8 h-8 rounded-full transition-all", isRecording && transcribingField === fieldName ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-primary/10 text-primary hover:bg-primary/20")}>
        {(isTranscribing && transcribingField === fieldName) ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Mic className="w-4 h-4" />}
      </Button>
    </div>
  )


  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h3 className="text-lg font-semibold text-center mb-4">Información Fundamental</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {renderField("businessName", "Nombre del Negocio")}
              {renderField("contactName", "Nombre del Contacto")}
              {renderField("phone", "Teléfono")}
              {renderField("email", "Email")}
            </div>
            {renderField("address", "Dirección")}
            {renderTextarea("businessActivity", "Actividad Comercial Principal")}
            {renderField("relationshipType", "Tipo de Relación (Ej: Amigo, Cliente previo)")}
          </>
        )
      case 2:
        return (
          <>
            <h3 className="text-lg font-semibold text-center mb-4">Diagnóstico y Necesidades</h3>
            <MultiProductSelector
              products={products}
              selectedProducts={formData.interestedProduct}
              onSelectionChange={(selected) => handleInputChange("interestedProduct", selected as any)}
              label="Productos/Servicios de Interés"
            />
            {renderTextarea("quantifiedProblem", "Problema Cuantificado")}
            {renderTextarea("conservativeGoal", "Objetivo Conservador")}
            {renderTextarea("verbalAgreements", "Acuerdos Verbales Previos")}
          </>
        )
      case 3:
        return (
          <>
            <h3 className="text-lg font-semibold text-center mb-4">Contexto y Rendimiento del Negocio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {renderField("yearsInBusiness", "Años en el negocio")}
              {renderField("numberOfEmployees", "Número de empleados")}
              {renderField("numberOfBranches", "Número de sucursales")}
              {renderField("currentClientsPerMonth", "Clientes por mes")}
              {renderField("averageTicket", "Ticket promedio de venta")}
              {renderField("facebookFollowers", "Seguidores en Facebook")}
            </div>
            {renderTextarea("knownCompetition", "Competencia que conoce")}
            {renderTextarea("otherAchievements", "Otros logros o reconocimientos")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {renderField("highSeason", "Temporada alta")}
              {renderField("criticalDates", "Fechas críticas")}
            </div>
          </>
        )
      case 4:
        return (
          <>
            <h3 className="text-lg font-semibold text-center mb-4">Perfil Humano y Análisis Estratégico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {renderField("personalityType", "Estilo de Decisión")}
              {renderField("communicationStyle", "Estilo de Comunicación")}
            </div>
            {renderTextarea("keyPhrases", "Frases Clave Repetidas")}
            <h3 className="text-lg font-semibold text-center mb-4 mt-6">Análisis Estratégico (FODA)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {renderTextarea("strengths", "Fortalezas")}
              {renderTextarea("weaknesses", "Debilidades")}
              {renderTextarea("opportunities", "Oportunidades")}
              {renderTextarea("threats", "Amenazas")}
            </div>
          </>
        )
      case 5:
        return (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4">Revisar y Enviar</h3>
            <p className="text-muted-foreground mb-6">Asegúrate que toda la información sea correcta.</p>
            <Button onClick={handleSubmit} className="w-full py-4 text-base font-semibold bg-gradient-to-r from-[#ff6b35] to-[#ffd23f] text-white rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : leadId ? 'Actualizar Expediente' : 'Finalizar y Crear Expediente'}
            </Button>
          </div>
        )
      case 6:
        return (
          <div className="text-center animate-pop-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">¡Expediente {leadId ? 'Actualizado' : 'Creado'}!</h3>
            <Button onClick={onBack} className="w-full py-4 text-base font-semibold bg-gradient-to-r from-[#ff6b35] to-[#ffd23f] text-white rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300">
              Volver a la lista
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  const Icon = sectionIcons[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f5f3] to-[#e8e6e3] p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-2xl mx-auto relative">
        <Link href="/dashboard" passHref>
          <Button variant="outline" size="icon" className="absolute top-0 right-0 mt-4 mr-4 bg-white/80 backdrop-blur-sm">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <div className="progress-indicator flex justify-center mb-8 gap-2">
          {steps.map(step => (
            <div key={step.id} className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              currentStep === step.id && "scale-150 bg-primary-gradient",
              currentStep > step.id && "bg-green-500",
              currentStep < step.id && "bg-gray-300"
            )} />
          ))}
        </div>

        <div className={cn("form-section bg-white rounded-2xl p-8 shadow-xl mb-4", animation)}>
          <div className={cn("icon-container w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg bg-primary-gradient")}>
            {Icon && <Icon className="w-8 h-8 text-white" />}
          </div>
          {renderStep()}
        </div>

        {currentStep < 5 && (
          <div className="flex justify-between items-center mt-8">
            <Button onClick={handlePrev} disabled={currentStep === 1} className="py-3 px-6 bg-transparent border-2 border-[#e8e6e3] rounded-xl text-muted-foreground font-semibold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
              Anterior
            </Button>
            <Button onClick={handleNext} className="py-3 px-6 text-white rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 font-semibold bg-primary-gradient">
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
