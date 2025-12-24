"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, User, CheckCircle, Sparkles, Telescope, BarChart2, Handshake, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { MultiProductSelector } from "@/components/recorridos/multi-product-selector"
import { getProducts } from "@/app/actions/product-actions"
import { toast } from "sonner"

interface ClientEditFormProps {
    clientData: any
    onSave: () => void
    onCancel: () => void
}

const sectionIcons: { [key: number]: React.ElementType } = {
    1: User,
    2: Telescope,
    3: BarChart2,
    4: Handshake,
    5: FileText,
    6: Sparkles,
}

export function ClientEditForm({ clientData, onSave, onCancel }: ClientEditFormProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [animation, setAnimation] = useState("animate-slide-in-right")
    const [isRecording, setIsRecording] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [transcribingField, setTranscribingField] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [products, setProducts] = useState<any[]>([])

    const [formData, setFormData] = useState({
        businessName: clientData.businessName || "",
        contactName: clientData.contactName || "",
        phone: clientData.phone || "",
        email: clientData.email || "",
        city: clientData.city || "",
        address: clientData.address || "",
        businessActivity: clientData.businessActivity || "",
        businessType: clientData.businessType || "",
        relationshipType: clientData.relationshipType || "",
        interestedProduct: Array.isArray(clientData.interestedProduct)
            ? clientData.interestedProduct
            : (typeof clientData.interestedProduct === 'string' && clientData.interestedProduct.length > 0
                ? clientData.interestedProduct.split(',').map((s: string) => s.trim())
                : []),
        pains: clientData.pains || "",
        goals: clientData.goals || "",
        objections: clientData.objections || "",
        quantifiedProblem: clientData.quantifiedProblem || "",
        conservativeGoal: clientData.conservativeGoal || "",
        verbalAgreements: clientData.verbalAgreements || "",
        yearsInBusiness: clientData.yearsInBusiness?.toString() || "",
        numberOfEmployees: clientData.numberOfEmployees?.toString() || "",
        numberOfBranches: clientData.numberOfBranches?.toString() || "",
        currentClientsPerMonth: clientData.currentClientsPerMonth?.toString() || "",
        averageTicket: clientData.averageTicket?.toString() || "",
        knownCompetition: clientData.knownCompetition || "",
        highSeason: clientData.highSeason || "",
        criticalDates: clientData.criticalDates || "",
        facebookFollowers: clientData.facebookFollowers?.toString() || "",
        otherAchievements: clientData.otherAchievements || "",
        specificRecognitions: clientData.specificRecognitions || "",
        personalityType: clientData.personalityType || "",
        communicationStyle: clientData.communicationStyle || "",
        keyPhrases: clientData.keyPhrases || "",
        strengths: clientData.strengths || "",
        weaknesses: clientData.weaknesses || "",
        opportunities: clientData.opportunities || "",
        threats: clientData.threats || "",
        contractValue: clientData.contractValue?.toString() || "",
    })

    useEffect(() => {
        async function loadProducts() {
            const result = await getProducts();
            if (result.success && result.data) {
                setProducts(result.data);
            }
        }
        loadProducts();
    }, [])

    const steps = [
        { id: 1, title: "Información Fundamental" },
        { id: 2, title: "Perfilado y Necesidades" },
        { id: 3, title: "Contexto y Rendimiento" },
        { id: 4, title: "Perfil y Análisis Estratégico" },
        { id: 5, title: "Revisión" },
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

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
            toast.error("No se pudo acceder al micrófono")
        }
    }

    const transcribeAudio = async (audioBlob: Blob, field: string) => {
        setTranscribingField(field)
        setIsTranscribing(true)
        try {
            const form = new FormData()
            form.append("audio", audioBlob, "recording.wav")

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: form,
            })

            if (response.ok) {
                const { transcription } = await response.json()
                const currentValue = formData[field as keyof typeof formData]
                const newValue = Array.isArray(currentValue) ? currentValue.join(', ') : currentValue;
                const updatedValue = newValue ? `${newValue}\n${transcription}` : transcription
                handleInputChange(field, updatedValue)
            } else {
                toast.error("Error al transcribir")
            }
        } catch (error) {
            toast.error("Error en la transcripción")
        } finally {
            setIsTranscribing(false)
            setTranscribingField(null)
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const submissionData = {
                ...formData,
                interestedProduct: Array.isArray(formData.interestedProduct)
                    ? formData.interestedProduct.join(', ')
                    : formData.interestedProduct,
                yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : null,
                numberOfEmployees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees) : null,
                numberOfBranches: formData.numberOfBranches ? parseInt(formData.numberOfBranches) : null,
                currentClientsPerMonth: formData.currentClientsPerMonth ? parseInt(formData.currentClientsPerMonth) : null,
                averageTicket: formData.averageTicket ? parseInt(formData.averageTicket) : null,
                facebookFollowers: formData.facebookFollowers ? parseInt(formData.facebookFollowers) : null,
                contractValue: formData.contractValue ? parseFloat(formData.contractValue) : null,
            };

            const response = await fetch(`/api/clients/${clientData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (response.ok) {
                toast.success("Expediente de cliente actualizado");
                onSave();
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.details || errorData.error || 'Desconocido';
                toast.error(`Error: ${errorMessage}`);
            }
        } catch (error) {
            toast.error("Error al guardar los cambios");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (fieldName: keyof typeof formData, label: string, type: string = "text") => (
        <div className="relative mb-6">
            <Input
                id={fieldName}
                type={type}
                value={formData[fieldName] as string}
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                placeholder=" "
                className="peer w-full p-4 border-2 border-muted rounded-xl bg-background transition-all focus:border-primary"
            />
            <label htmlFor={fieldName} className="absolute top-4 left-5 text-muted-foreground transition-all duration-300 pointer-events-none peer-focus:top-[-10px] peer-focus:left-4 peer-focus:scale-90 peer-focus:text-primary peer-focus:bg-background peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-2">
                {label}
            </label>
        </div>
    )

    const renderTextarea = (fieldName: keyof typeof formData, label: string) => (
        <div className="relative mb-6">
            <Textarea
                id={fieldName}
                value={formData[fieldName] as string}
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                placeholder=" "
                className="peer w-full p-4 border-2 border-muted rounded-xl bg-background transition-all focus:border-primary min-h-[100px] pr-12"
            />
            <label htmlFor={fieldName} className="absolute top-4 left-5 text-muted-foreground transition-all duration-300 pointer-events-none peer-focus:top-[-10px] peer-focus:left-4 peer-focus:scale-90 peer-focus:text-primary peer-focus:bg-background peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-2">
                {label}
            </label>
            <Button type="button" size="icon" onClick={() => startRecording(fieldName)} disabled={isTranscribing && transcribingField !== fieldName} className={cn("absolute top-3 right-3 w-8 h-8 rounded-full", isRecording && transcribingField === fieldName ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-primary/10 text-primary")}>
                {(isTranscribing && transcribingField === fieldName) ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Mic className="w-4 h-4" />}
            </Button>
        </div>
    )

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-center mb-6">Información Fundamental</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderField("businessName", "Nombre del Negocio")}
                            {renderField("contactName", "Nombre del Contacto")}
                            {renderField("phone", "Teléfono")}
                            {renderField("email", "Email")}
                            {renderField("city", "Ciudad")}
                            <div className="relative mb-6">
                                <Select value={formData.businessType} onValueChange={(val) => handleInputChange("businessType", val)}>
                                    <SelectTrigger className="w-full p-4 border-2 border-muted rounded-xl h-auto bg-background">
                                        <SelectValue placeholder="Tipo de Negocio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Restaurante">Restaurante</SelectItem>
                                        <SelectItem value="Hotel">Hotel</SelectItem>
                                        <SelectItem value="Gimnasio">Gimnasio</SelectItem>
                                        <SelectItem value="Inmobiliaria">Inmobiliaria</SelectItem>
                                        <SelectItem value="Otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {renderField("address", "Dirección Física")}
                        {renderTextarea("businessActivity", "Actividad Comercial Principal")}
                        {renderField("relationshipType", "Tipo de Relación")}
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-center mb-6">Diagnóstico y Necesidades</h3>
                        <MultiProductSelector
                            products={products}
                            selectedProducts={formData.interestedProduct}
                            onSelectionChange={(selected) => handleInputChange("interestedProduct", selected as any)}
                            label="Productos/Servicios Contratados o de Interés"
                        />
                        {renderTextarea("pains", "Dolores y Problemas")}
                        {renderTextarea("goals", "Metas y Objetivos")}
                        {renderTextarea("objections", "Objeciones y Barreras")}
                        {renderTextarea("quantifiedProblem", "Problema Cuantificado")}
                        {renderTextarea("conservativeGoal", "Objetivo Conservador")}
                        {renderTextarea("verbalAgreements", "Acuerdos Verbales")}
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-center mb-6">Contexto y Rendimiento</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderField("yearsInBusiness", "Años en el negocio", "number")}
                            {renderField("numberOfEmployees", "Número de empleados", "number")}
                            {renderField("numberOfBranches", "Número de sucursales", "number")}
                            {renderField("currentClientsPerMonth", "Clientes por mes", "number")}
                            {renderField("averageTicket", "Ticket promedio", "number")}
                            {renderField("facebookFollowers", "Seguidores FB", "number")}
                            {renderField("contractValue", "Valor del Contrato", "number")}
                        </div>
                        {renderTextarea("knownCompetition", "Competencia")}
                        {renderTextarea("otherAchievements", "Otros logros")}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderField("highSeason", "Temporada alta")}
                            {renderField("criticalDates", "Fechas críticas")}
                        </div>
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-center mb-6">Perfil Humano y Estratégico</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderField("personalityType", "Estilo de Decisión")}
                            {renderField("communicationStyle", "Estilo de Comunicación")}
                        </div>
                        {renderTextarea("keyPhrases", "Frases Clave")}
                        <h4 className="font-semibold mt-4 mb-2">Análisis FODA</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderTextarea("strengths", "Fortalezas")}
                            {renderTextarea("weaknesses", "Debilidades")}
                            {renderTextarea("opportunities", "Oportunidades")}
                            {renderTextarea("threats", "Amenazas")}
                        </div>
                    </div>
                )
            case 5:
                return (
                    <div className="text-center space-y-6">
                        <h3 className="text-2xl font-bold">Resumen de Cambios</h3>
                        <p className="text-muted-foreground">Has revisado el perfil detallado del cliente. ¿Deseas guardar todos los cambios en el expediente?</p>
                        <div className="p-4 bg-muted/30 rounded-lg text-left text-sm max-h-[300px] overflow-y-auto">
                            <pre>{JSON.stringify(formData, null, 2)}</pre>
                        </div>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-6 text-lg font-bold bg-primary text-white rounded-xl shadow-lg">
                            {isSubmitting ? "Guardando..." : "Actualizar Expediente Completo"}
                        </Button>
                    </div>
                )
            default:
                return null
        }
    }

    const Icon = sectionIcons[currentStep]

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Edición de Expediente</h2>
                        <p className="text-muted-foreground">Paso {currentStep} de {steps.length}: {steps[currentStep - 1].title}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onCancel}>
                    <X className="w-6 h-6" />
                </Button>
            </div>

            <div className="mb-8">
                <div className="flex justify-between gap-2">
                    {steps.map(step => (
                        <div key={step.id} className={cn(
                            "h-2 flex-1 rounded-full transition-all duration-300",
                            currentStep === step.id ? "bg-primary" : (currentStep > step.id ? "bg-green-500" : "bg-muted")
                        )} />
                    ))}
                </div>
            </div>

            <div className={cn("bg-card border rounded-2xl p-8 shadow-sm min-h-[500px]", animation)}>
                {renderStep()}
            </div>

            {currentStep < 5 && (
                <div className="flex justify-between items-center mt-8">
                    <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1} className="py-6 px-8 rounded-xl">
                        Anterior
                    </Button>
                    <Button onClick={handleNext} className="py-6 px-8 rounded-xl bg-primary text-white">
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    )
}
