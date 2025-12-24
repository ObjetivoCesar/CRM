'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, FileText, Phone, MapPin, Calendar, User, UserCheck, Loader2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Lead {
  id: string
  businessName: string
  contactName: string
  phone?: string
  email?: string
  address?: string
  connectionType?: string
  businessActivity?: string
  interestedProduct?: string
  personalityType?: string
  status: string
  phase: number
  createdAt: string
  strengths?: string
  weaknesses?: string
  opportunities?: string
  threats?: string
  communicationStyle?: string
  keyPhrases?: string
  quantifiedProblem?: string
  conservativeGoal?: string
  verbalAgreements?: string
  yearsInBusiness?: number
  numberOfEmployees?: number
  numberOfBranches?: number
  currentClientsPerMonth?: number
  averageTicket?: number
  knownCompetition?: string
  highSeason?: string
  criticalDates?: string
  facebookFollowers?: number
  otherAchievements?: string
  specificRecognitions?: string
}

const STAGES = {
  sin_contacto: 'Sin Contacto',
  primer_contacto: '1er Contacto',
  segundo_contacto: '2do Contacto',
  tercer_contacto: '3er Contacto',
} as const

type StageKey = keyof typeof STAGES

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads')
      if (!response.ok) throw new Error('Failed to fetch leads')
      const data = await response.json()
      setLeads(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToClient = async (leadToConvert?: Lead) => {
    const targetLead = leadToConvert || selectedLead
    if (!targetLead) return

    setIsConverting(true)
    try {
      const response = await fetch(`/api/leads/${targetLead.id}/convert`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        alert('¡Lead convertido a cliente exitosamente!')
        setSelectedLead(null)
        fetchLeads()
      } else {
        alert(`Error al convertir el lead: ${result.error}`)
      }
    } catch (error) {
      alert('Ocurrió un error de red. Inténtalo de nuevo.')
      console.error('Conversion error:', error)
    } finally {
      setIsConverting(false)
    }
  }

  const handleLeadMove = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        setLeads(prevLeads =>
          prevLeads.map(lead =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        )
      } else {
        alert('Error al actualizar el estado del lead')
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Error de conexión al actualizar')
    }
  }

  const getPhaseText = (phase: number) => {
    switch (phase) {
      case 1:
        return 'Información Básica'
      case 2:
        return 'Análisis de Personalidad'
      case 3:
        return 'Análisis FODA'
      case 4:
        return 'Expediente Completo'
      default:
        return 'Sin definir'
    }
  }

  // Group leads by stage
  const leadsByStage = {
    sin_contacto: leads.filter(l => l.status === 'sin_contacto'),
    primer_contacto: leads.filter(l => l.status === 'primer_contacto'),
    segundo_contacto: leads.filter(l => l.status === 'segundo_contacto'),
    tercer_contacto: leads.filter(l => l.status === 'tercer_contacto'),
  }

  // Leads with other statuses (cotizado, convertido)
  const otherLeads = leads.filter(l =>
    !['sin_contacto', 'primer_contacto', 'segundo_contacto', 'tercer_contacto'].includes(l.status)
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className='flex items-center justify-center h-64'>
          <div className='text-lg text-muted-foreground'>Cargando leads...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-3xl font-bold text-foreground'>Gestión de Leads - Kanban</h2>
            <p className='text-muted-foreground'>Seguimiento de contacto por etapas</p>
          </div>
          <Badge variant='secondary' className='text-lg px-4 py-2'>
            {leads.length} Leads Total
          </Badge>
        </div>

        {/* Kanban Board */}
        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
          {(Object.keys(STAGES) as StageKey[]).map((stageKey) => (
            <KanbanColumn
              key={stageKey}
              title={STAGES[stageKey]}
              leads={leadsByStage[stageKey]}
              onLeadMove={handleLeadMove}
              onLeadClick={setSelectedLead}
              onLeadConvert={handleConvertToClient}
            />
          ))}
        </div>

        {/* Other Statuses Section */}
        {otherLeads.length > 0 && (
          <div className='mt-8'>
            <h3 className='text-xl font-semibold mb-4'>Otros Estados</h3>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {otherLeads.map((lead) => (
                <Card key={lead.id} className='glass-card hover:shadow-lg transition-all duration-200 border-primary/20'>
                  <CardHeader className='pb-3'>
                    <div className='flex items-center justify-between'>
                      <CardTitle className='text-lg font-semibold text-foreground'>{lead.businessName}</CardTitle>
                      <Badge className='bg-purple-500 text-white capitalize'>{lead.status}</Badge>
                    </div>
                    <CardDescription className='flex items-center space-x-2'>
                      <User className='h-4 w-4' />
                      <span>{lead.contactName}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-2 text-sm'>
                      <div className='flex items-center space-x-2 text-muted-foreground'>
                        <MapPin className='h-4 w-4' />
                        <span>{lead.businessActivity}</span>
                      </div>
                      <div className='flex items-center space-x-2 text-muted-foreground'>
                        <Phone className='h-4 w-4' />
                        <span>{lead.phone}</span>
                      </div>
                    </div>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='w-full hover:bg-primary/10'
                      onClick={() => setSelectedLead(lead)}
                    >
                      <Eye className='h-4 w-4 mr-1' />
                      Ver Detalles
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {leads.length === 0 && (
          <Card className='glass-card text-center py-12'>
            <CardContent>
              <div className='space-y-4'>
                <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto'>
                  <User className='h-8 w-8 text-primary' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-foreground'>No hay leads disponibles</h3>
                  <p className='text-muted-foreground'>Los leads creados desde Recorridos aparecerán aquí</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div className='fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 bg-[rgba(216,214,214,0.28804347826086957)] gap-1 mx-3 tracking-normal text-black font-semibold font-mono'>
            <Card className='glass-strong max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
              <CardHeader className='border-b border-primary/20'>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-xl text-foreground'>{selectedLead.businessName}</CardTitle>
                    <CardDescription>{selectedLead.contactName}</CardDescription>
                  </div>
                  <Button variant='ghost' onClick={() => setSelectedLead(null)}>
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='space-y-6 pt-6'>
                <div className='grid md:grid-cols-3 gap-6'>
                  <div className='space-y-4'>
                    <h4 className='font-semibold text-foreground'>Información del Negocio</h4>
                    <div className='space-y-2 text-sm'>
                      <p><span className='font-medium'>Actividad:</span> {selectedLead.businessActivity}</p>
                      <p><span className='font-medium'>Producto de Interés:</span> {selectedLead.interestedProduct}</p>
                      <p><span className='font-medium'>Tipo de Conexión:</span> {selectedLead.connectionType}</p>
                      <p><span className='font-medium'>Dirección:</span> {selectedLead.address}</p>
                      <p><span className='font-medium'>Teléfono:</span> {selectedLead.phone}</p>
                      <p><span className='font-medium'>Email:</span> {selectedLead.email}</p>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <h4 className='font-semibold text-foreground'>Perfil Humano</h4>
                    <div className='space-y-2 text-sm'>
                      <p><span className='font-medium'>Personalidad:</span> {selectedLead.personalityType}</p>
                      <p><span className='font-medium'>Estilo de Comunicación:</span> {selectedLead.communicationStyle}</p>
                      <p><span className='font-medium'>Frases Clave:</span> {selectedLead.keyPhrases}</p>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <h4 className='font-semibold text-foreground'>Diagnóstico y Metas</h4>
                    <div className='space-y-2 text-sm'>
                      <p><span className='font-medium'>Problema Cuantificado:</span> {selectedLead.quantifiedProblem}</p>
                      <p><span className='font-medium'>Meta Conservadora:</span> {selectedLead.conservativeGoal}</p>
                      <p><span className='font-medium'>Acuerdos Verbales:</span> {selectedLead.verbalAgreements}</p>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <h4 className='font-semibold text-foreground'>Datos del Negocio</h4>
                    <div className='space-y-2 text-sm'>
                      <p><span className='font-medium'>Años en Negocio:</span> {selectedLead.yearsInBusiness}</p>
                      <p><span className='font-medium'>N° Empleados:</span> {selectedLead.numberOfEmployees}</p>
                      <p><span className='font-medium'>N° Sucursales:</span> {selectedLead.numberOfBranches}</p>
                      <p><span className='font-medium'>Clientes/Mes:</span> {selectedLead.currentClientsPerMonth}</p>
                      <p><span className='font-medium'>Ticket Promedio:</span> {selectedLead.averageTicket}</p>
                      <p><span className='font-medium'>Seguidores Facebook:</span> {selectedLead.facebookFollowers}</p>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <h4 className='font-semibold text-foreground'>Contexto Estratégico</h4>
                    <div className='space-y-2 text-sm'>
                      <p><span className='font-medium'>Competencia:</span> {selectedLead.knownCompetition}</p>
                      <p><span className='font-medium'>Temporada Alta:</span> {selectedLead.highSeason}</p>
                      <p><span className='font-medium'>Fechas Críticas:</span> {selectedLead.criticalDates}</p>
                      <p><span className='font-medium'>Logros:</span> {selectedLead.otherAchievements}</p>
                      <p><span className='font-medium'>Reconocimientos:</span> {selectedLead.specificRecognitions}</p>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <h4 className='font-semibold text-foreground'>Análisis FODA</h4>
                    <div className='space-y-2 text-sm'>
                      <p><span className='font-medium text-green-600'>Fortalezas:</span> {selectedLead.strengths}</p>
                      <p><span className='font-medium text-red-600'>Debilidades:</span> {selectedLead.weaknesses}</p>
                      <p><span className='font-medium text-blue-600'>Oportunidades:</span> {selectedLead.opportunities}</p>
                      <p><span className='font-medium text-orange-600'>Amenazas:</span> {selectedLead.threats}</p>
                    </div>
                  </div>
                </div>

                <div className='flex space-x-3 pt-4 border-t border-primary/20'>
                  <Button
                    className='flex-1 bg-green-600 hover:bg-green-700'
                    onClick={() => handleConvertToClient()}
                    disabled={selectedLead.status === 'convertido' || isConverting}
                  >
                    {isConverting ? (
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    ) : (
                      <UserCheck className='h-4 w-4 mr-2' />
                    )}
                    {selectedLead.status === 'convertido' ? 'Ya Convertido' : 'Convertir a Cliente'}
                  </Button>
                  <Link href='/cotizaciones' className='flex-1'>
                    <Button className='w-full'>
                      <FileText className='h-4 w-4 mr-2' />
                      Crear Cotización
                    </Button>
                  </Link>
                  <Link href={`/recorridos?leadId=${selectedLead.id}`} className='flex-1'>
                    <Button variant="outline" className='w-full'>
                      Editar
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Kanban Column Component
function KanbanColumn({
  title,
  leads,
  onLeadMove,
  onLeadClick,
  onLeadConvert,
}: {
  title: string
  leads: Lead[]
  onLeadMove: (leadId: string, newStatus: string) => void
  onLeadClick: (lead: Lead) => void
  onLeadConvert: (lead: Lead) => void
}) {
  return (
    <div className='bg-muted/30 rounded-lg p-4 min-h-[600px]'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='font-semibold text-foreground'>{title}</h3>
        <Badge variant='secondary'>{leads.length}</Badge>
      </div>
      <div className='space-y-3'>
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onMove={onLeadMove}
            onClick={() => onLeadClick(lead)}
            onConvert={() => onLeadConvert(lead)}
          />
        ))}
        {leads.length === 0 && (
          <div className='text-center text-muted-foreground text-sm py-8'>
            Sin leads en esta etapa
          </div>
        )}
      </div>
    </div>
  )
}

// Compact Lead Card Component
function LeadCard({
  lead,
  onMove,
  onClick,
  onConvert,
}: {
  onMove: (leadId: string, newStatus: string) => void
  onClick: () => void
  onConvert: () => void
}) {
  return (
    <Card className='cursor-pointer hover:shadow-md transition-shadow h-[110px] flex flex-col justify-between group relative overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-700'>
      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='h-5 w-5 p-0 bg-gray-800/80 backdrop-blur-sm text-white'>
              <MoreVertical className='h-3 w-3' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className="bg-gray-900 border-gray-800 text-white">
            <DropdownMenuItem onClick={() => onMove(lead.id, 'sin_contacto')} className="focus:bg-gray-800 focus:text-white">
              Sin Contacto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(lead.id, 'primer_contacto')} className="focus:bg-gray-800 focus:text-white">
              1er Contacto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(lead.id, 'segundo_contacto')} className="focus:bg-gray-800 focus:text-white">
              2do Contacto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(lead.id, 'tercer_contacto')} className="focus:bg-gray-800 focus:text-white">
              3er Contacto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConvert(); }} className="focus:bg-gray-800 focus:text-white text-green-500 hover:text-green-400">
              Convertir a Cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className='p-2.5 flex flex-col h-full' onClick={onClick}>
        <div className='flex items-start justify-between mb-1'>
          <div className='w-full'>
            <h4 className='font-semibold text-xs text-foreground truncate pr-4 leading-tight' title={lead.businessName}>
              {lead.businessName}
            </h4>
            <div className='flex items-center gap-1 text-[10px] text-muted-foreground mt-1'>
              <User className="h-2.5 w-2.5" />
              <span className="truncate max-w-[120px]">{lead.contactName}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          {lead.phone && (
            <div className='flex items-center gap-1 text-[10px] text-muted-foreground mb-1'>
              <Phone className="h-2.5 w-2.5" />
              <span>{lead.phone}</span>
            </div>
          )}
          <Badge variant='outline' className='text-[9px] h-4 px-1 w-full justify-center bg-muted/30 line-clamp-1 truncate border-dashed'>
            {lead.businessActivity || '-'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}