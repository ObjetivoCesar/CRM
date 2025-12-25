"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface Client {
    id: string
    businessName: string
    contactName: string
}

interface ContactSelectorProps {
    value?: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function ContactSelector({ value, onChange, disabled }: ContactSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [clients, setClients] = React.useState<Client[]>([])
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoading(true)
                const response = await fetch("/api/clients")
                if (response.ok) {
                    const data = await response.json()
                    // Adapter for different API response structures
                    const clientList = Array.isArray(data) ? data : (data.data || [])

                    setClients(clientList.map((c: any) => ({
                        id: c.id,
                        businessName: c.businessName || c.business_name || "Sin Nombre",
                        contactName: c.contactName || c.contact_name || ""
                    })))
                }
            } catch (error) {
                console.error("Failed to fetch clients", error)
            } finally {
                setLoading(false)
            }
        }

        fetchClients()
    }, [])

    const selectedClient = clients.find((client) => client.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled || loading}
                >
                    {loading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</span>
                    ) : selectedClient ? (
                        selectedClient.businessName
                    ) : (
                        "Seleccionar cliente..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                        <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                        <CommandGroup>
                            {clients.map((client) => (
                                <CommandItem
                                    key={client.id}
                                    value={client.businessName + " " + client.contactName}
                                    onSelect={() => {
                                        onChange(client.id === value ? "" : client.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === client.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{client.businessName}</span>
                                        {client.contactName && <span className="text-xs text-muted-foreground">{client.contactName}</span>}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
