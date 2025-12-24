"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Plus, Save, BookOpen, Loader2, Sparkles, Search, Check, ChevronsUpDown, Eye, Download, Mail, MessageCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Lead } from "@/lib/types"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import { QuotationDocument } from "@/components/pdf/QuotationDocument"
import { sendQuotationEmail } from "@/app/actions/email-actions"

// Dynamic imports to avoid SSR issues with React-PDF
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFViewer), {
  ssr: false,
  loading: () => <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>,
});
const PDFDownloadLink = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink), {
  ssr: false,
  loading: () => <Button disabled>Cargando PDF...</Button>,
});

import { getProducts } from "@/app/actions/product-actions"


const templates = [
  { id: "propuesta_comercial", name: "Propuesta Comercial (Restaurantes/Hoteles) ⭐" },
  { id: "plantilla_3_logico_extrovertido", name: "Lógico Extrovertido (Original)" },
  { id: "plantilla_1_emocional_extrovertido", name: "Emocional Extrovertido" },
  { id: "plantilla_2_emocional_introvertido", name: "Emocional Introvertido" },
  { id: "plantilla_4_logico_introvertido", name: "Lógico Introvertido" },
]

const InfoField = ({ label, value }: { label: string; value: string | number | string[] | undefined }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div>
      <h5 className="font-semibold text-foreground">{label}</h5>
      <p className="text-muted-foreground whitespace-pre-wrap">{Array.isArray(value) ? value.join(", ") : value}</p>
    </div>
  )
}

export default function CotizacionesPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [isGeneratingQuotation, setIsGeneratingQuotation] = useState(false)
  const [open, setOpen] = useState(false)
  const [openProduct, setOpenProduct] = useState(false) // For product combobox

  const [quotationContent, setQuotationContent] = useState<string>("")
  const [products, setProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)


  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    loadLeads()
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const result = await getProducts();
    if (result.success && result.data) {
      setProducts(result.data);
    }
  }

  useEffect(() => {
    const lead = leads.find((l) => l.id === selectedLead);
    if (lead && lead.quotation) {
      setQuotationContent(lead.quotation);
    } else {
      setQuotationContent("");
    }
  }, [selectedLead, leads]);

  const loadLeads = async () => {
    try {
      const response = await fetch("/api/leads");
      if (response.ok) {
        const data = await response.json();
        // Ensure data is array before setting, handle potential API response structure
        if (Array.isArray(data)) {
          setLeads(data);
        } else if (data.leads && Array.isArray(data.leads)) {
          setLeads(data.leads);
        } else {
          console.error("Unexpected leads API response:", data);
          setLeads([]);
        }
      } else {
        console.error("Error loading leads:", await response.text());
      }
    } catch (error) {
      console.error("Error loading leads:", error);
    }
  }

  const handleShareWhatsApp = () => {
    const name = selectedLeadData?.contactName?.split(' ')[0] || '';
    const business = selectedLeadData?.businessName || 'tu negocio';
    const message = `Hola ${name}, un gusto saludarte de parte de *Objetivo*. 🚀\n\nComo acordamos, te comparto el PDF con la propuesta comercial estratégica diseñada para *${business}*.\n\nQuedo atento a tus comentarios para avanzar al siguiente paso.\n\nSaludos.`;
    let phone = selectedLeadData?.phone?.replace(/\D/g, '') || '';

    // Auto-format for Ecuador (593) if it's a local number
    if (phone.startsWith('0')) {
      phone = '593' + phone.substring(1);
    } else if (!phone.startsWith('593') && phone.length === 9) {
      // If entered as 9 digits without leading 0
      phone = '593' + phone;
    }

    // Use api.whatsapp.com directly to avoid wa.me redirect issues with text encoding
    // Force %20 instead of + for spaces, as some desktop apps handle + poorly in protocol handlers
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  const handleDownloadPDF = async () => {
    if (!selectedLeadData || !quotationContent) return;

    setIsDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");

      const doc = (
        <QuotationDocument
          content={quotationContent}
          logoUrl={window.location.origin + "/logo-membrete.png"}
          footerUrl={window.location.origin + "/pie-pagina.png"}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Propuesta Comercial para ${selectedLeadData.businessName || 'Cliente'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("❌ Error al descargar el PDF");
    } finally {
      setIsDownloading(false);
    }
  }

  const handleSendEmail = async () => {
    if (!selectedLeadData || !quotationContent) return;

    setIsSendingEmail(true);
    try {
      console.log('🔄 Generando PDF...');

      // Dynamic import to avoid SSR issues
      const { pdf } = await import("@react-pdf/renderer");

      const doc = (
        <QuotationDocument
          content={quotationContent}
          logoUrl={window.location.origin + "/logo-membrete.png"}
          footerUrl={window.location.origin + "/pie-pagina.png"}
        />
      );

      // Generate PDF blob
      const blob = await pdf(doc).toBlob();
      console.log('✅ PDF generado:', blob.size, 'bytes');

      // Convert blob to base64 using Promise wrapper
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Remove data:application/pdf;base64, prefix
          console.log('✅ PDF convertido a base64:', base64.length, 'caracteres');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('📧 Preparando email...');
      const formData = new FormData();
      formData.append('to', selectedLeadData.email || '');
      formData.append('subject', `Propuesta Comercial - ${selectedLeadData.businessName || 'Cliente'}`);
      const name = (selectedLeadData.contactName || 'Cliente').split(' ')[0];
      formData.append('body', `Hola ${name},\n\nAdjunto encontrarás la propuesta comercial detallada que hemos preparado para ${selectedLeadData.businessName || 'su negocio'}.\n\nQuedamos atentos a tus comentarios.\n\nSaludos cordiales,\nObjetivo`);
      formData.append('attachment', base64data);
      formData.append('filename', `Propuesta Comercial para ${selectedLeadData.businessName || 'Cliente'}.pdf`);

      console.log('📤 Enviando email...');
      const result = await sendQuotationEmail(formData);

      if (result.success) {
        alert("✅ Email enviado exitosamente con PDF adjunto");
      } else {
        alert("❌ Error al enviar email: " + result.error);
      }
    } catch (error) {
      console.error("💥 Error generating PDF or sending email:", error);
      alert("❌ Error procesando el envío");
    } finally {
      setIsSendingEmail(false);
    }
  }



  const generateQuotation = async () => {
    if (!selectedLead) {
      alert("Selecciona un lead primero")
      return
    }

    if (!selectedTemplate) {
      alert("Selecciona una plantilla primero")
      return
    }

    setIsGeneratingQuotation(true)
    setQuotationContent("Generando cotización con IA...")
    try {
      const response = await fetch("/api/quotations/generate-full-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead,
          templateId: selectedTemplate
        }),
      })
      const result = await response.json()
      if (result.success) {
        setQuotationContent(result.quotation)
      } else {
        alert(`❌ Error generando cotización: ${result.error}`)
        setQuotationContent("")
      }
    } catch (error) {
      console.error("Error calling generate-full-quotation API:", error)
      alert(`❌ Error de conexión al generar cotización.`)
      setQuotationContent("")
    } finally {
      setIsGeneratingQuotation(false)
    }
  }

  const saveQuotation = async () => {
    if (!selectedLead || !quotationContent) return

    try {
      const response = await fetch(`/api/leads/${selectedLead}`, {
        method: "PATCH", // Or PUT, depending on API design
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotation: quotationContent, status: 'cotizado' }),
      });

      if (response.ok) {
        alert("✅ Cotización guardada exitosamente")
        // Refresh leads data locally to reflect changes
        setLeads(prevLeads => prevLeads.map(l => l.id === selectedLead ? { ...l, quotation: quotationContent } : l));
      } else {
        const errorText = await response.text();
        console.error("Error saving quotation:", errorText)
        alert("❌ Error guardando cotización")
      }
    } catch (error) {
      console.error("Error saving quotation:", error)
      alert("❌ Error de conexión al guardar")
    }
  }


  const selectedLeadData = leads.find((l) => l.id === selectedLead)

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Constructor de Cotizaciones</h1>
          <p className="text-muted-foreground">Crea cotizaciones personalizadas usando plantillas y asistencia de IA.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Controles y Datos */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Pasos de Creación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="lead-select">1. Lead a Cotizar (Buscador)</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {selectedLead
                          ? leads.find((lead) => lead.id === selectedLead)?.businessName
                          : "Buscar lead..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar por nombre o empresa..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron leads.</CommandEmpty>
                          <CommandGroup>
                            {leads.map((lead) => (
                              <CommandItem
                                key={lead.id}
                                value={lead.businessName + " " + lead.contactName}
                                onSelect={(currentValue) => {
                                  setSelectedLead(lead.id === selectedLead ? "" : lead.id)
                                  setOpen(false)
                                }}
                                className="data-[selected=true]:bg-gray-100 data-[selected=true]:text-black text-white"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedLead === lead.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium text-black">{lead.businessName}</span>
                                  <span className="text-xs text-gray-500">{lead.contactName}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedLeadData && (
                  <div className="mb-4">
                    <Label className="text-sm font-semibold text-foreground">Personalidad del Lead:</Label>
                    <Badge variant="secondary" className="ml-2 text-base">
                      {selectedLeadData.personalityType}
                    </Badge>
                  </div>
                )}
                <div>
                  <Label htmlFor="template-select">2. Plantilla</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>3. Generar Cotización con IA</Label>
                  <Button
                    onClick={generateQuotation}
                    disabled={!selectedLead || !selectedTemplate || isGeneratingQuotation}
                    className="w-full"
                  >
                    {isGeneratingQuotation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generar Cotización (IA)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {selectedLeadData && (
              <Card>
                <CardHeader>
                  <CardTitle>Información del Lead</CardTitle>
                  <CardDescription>
                    Detalles completos del lead seleccionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoField label="Nombre de Contacto" value={selectedLeadData.contactName} />
                  <InfoField label="Email" value={selectedLeadData.email} />
                  <InfoField label="Teléfono" value={selectedLeadData.phone} />
                  <InfoField label="Actividad del Negocio" value={selectedLeadData.businessActivity} />
                  <InfoField label="Ubicación" value={selectedLeadData.businessLocation} />
                  <InfoField label="Años en el Mercado" value={selectedLeadData.yearsInBusiness} />
                  <InfoField label="Número de Empleados" value={selectedLeadData.numberOfEmployees} />
                  <InfoField label="Sucursales" value={selectedLeadData.numberOfBranches} />
                  <InfoField label="Clientes Actuales por Mes" value={selectedLeadData.currentClientsPerMonth} />
                  <InfoField label="Ticket Promedio" value={selectedLeadData.averageTicket} />
                  <InfoField label="Problema Cuantificado" value={selectedLeadData.quantifiedProblem} />
                  <InfoField label="Meta Conservadora" value={selectedLeadData.conservativeGoal} />
                  <InfoField label="Acuerdos Verbales" value={selectedLeadData.verbalAgreements} />
                  <InfoField label="Competencia Conocida" value={selectedLeadData.knownCompetition} />
                  <InfoField label="Seguidores en Facebook" value={selectedLeadData.facebookFollowers} />
                  <InfoField label="Otros Logros" value={selectedLeadData.otherAchievements} />
                  <InfoField label="Reconocimientos Específicos" value={selectedLeadData.specificRecognitions} />
                  <InfoField label="Temporada Alta" value={selectedLeadData.highSeason} />
                  <InfoField label="Fechas Críticas" value={selectedLeadData.criticalDates} />
                  <InfoField label="Frases Clave" value={selectedLeadData.keyPhrases} />
                  <InfoField label="Productos de Interés" value={selectedLeadData.interestedProduct} />
                  <InfoField label="Fortalezas" value={selectedLeadData.strengths} />
                  <InfoField label="Oportunidades" value={selectedLeadData.opportunities} />
                  <InfoField label="Debilidades" value={selectedLeadData.weaknesses} />
                  <InfoField label="Amenazas" value={selectedLeadData.threats} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Catálogo de Productos
                </CardTitle>
                <CardDescription>
                  Selecciona un producto para ver sus detalles y copiarlos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Popover open={openProduct} onOpenChange={setOpenProduct}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openProduct}
                      className="w-full justify-between"
                    >
                      {selectedProduct
                        ? selectedProduct.name
                        : "Buscar producto..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar producto..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron productos.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                setSelectedProduct(product)
                                setOpenProduct(false)
                              }}
                              className="data-[selected=true]:bg-gray-100 data-[selected=true]:text-black text-white"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedProduct && (
                  <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {selectedProduct.description ? selectedProduct.description.replace(/<br>/g, '\n') : 'Sin descripción.'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Beneficios</Label>
                      <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {selectedProduct.benefits ? selectedProduct.benefits.replace(/<br>/g, '\n') : 'Sin beneficios.'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Precio</Label>
                      <div className="font-bold text-lg">
                        ${selectedProduct.price}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Editor de Cotización */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Editor de Cotización
                  </CardTitle>
                  <CardDescription>
                    Modifica el contenido antes de guardarlo.
                  </CardDescription>
                </div>
                <Button onClick={saveQuotation} size="sm" disabled={!quotationContent}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!quotationContent}>
                      <Eye className="h-4 w-4 mr-2" />
                      Vista Previa PDF
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-4">
                    <DialogHeader>
                      <DialogTitle>Vista Previa de Cotización (PDF Nativo)</DialogTitle>
                      <DialogDescription>
                        Esta vista previa renderiza el documento exactamente como se imprimirá (paginación real).
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 w-full bg-gray-100 rounded-md overflow-hidden relative">
                      {quotationContent && (
                        <PDFViewer width="100%" height="100%" className="border-none">
                          <QuotationDocument
                            content={quotationContent}
                            logoUrl={window.location.origin + "/logo-membrete.png"}
                            footerUrl={window.location.origin + "/pie-pagina.png"}
                          />
                        </PDFViewer>
                      )}
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                      <Button variant="outline" onClick={handleShareWhatsApp}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button variant="outline" onClick={handleSendEmail} disabled={isSendingEmail}>
                        {isSendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                        {isSendingEmail ? 'Enviando...' : 'Email'}
                      </Button>



                      <Button onClick={handleDownloadPDF} disabled={isDownloading} className="w-full sm:w-auto">
                        {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        {isDownloading ? 'Generando...' : 'Descargar PDF'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={quotationContent}
                  onChange={(e) => setQuotationContent(e.target.value)}
                  placeholder="Aquí aparecerá el contenido de la plantilla seleccionada..."
                  className="h-[calc(100vh-20rem)] resize-none border rounded-md p-4 text-sm leading-relaxed"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout >
  )
}
