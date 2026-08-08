'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Download, Upload, AlertTriangle, Building, Settings, Database, Store, Bot, MessageSquare, RefreshCw, LogOut, Home, Send, Instagram } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface BusinessProfile {
    companyName: string;
    address: string;
    phone: string;
    website: string;
    logoUrl: string;
}

interface UserPreferences {
    monthlySalesGoal: number;
    currency: 'USD' | 'MXN';
    emailNotifications: boolean;
    browserNotifications: boolean;
    autoBackup: boolean;
    whatsappTestMode: boolean;
    whatsappTestNumber: string;
}

interface LogEntry {
    timestamp: string;
    type: 'request' | 'response' | 'error';
    service: 'whatsapp' | 'telegram';
    message: string;
    data?: any;
}

function LogConsole({ logs, onClear }: { logs: LogEntry[], onClear: () => void }) {
    return (
        <div className="mt-6 rounded-xl border border-gray-800 bg-black/50 overflow-hidden font-mono text-[10px] md:text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Cortex Connectivity Terminal</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onClear} className="h-6 text-gray-500 hover:text-white hover:bg-gray-800">
                    Limpiar
                </Button>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-800">
                {logs.length === 0 ? (
                    <div className="text-gray-600 italic">Esperando actividad...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`border-l-2 pl-3 py-1 ${log.type === 'error' ? 'border-red-500 text-red-400 bg-red-500/5' :
                            log.type === 'response' ? 'border-blue-500 text-blue-400 bg-blue-500/5' :
                                'border-gray-700 text-gray-300'
                            }`}>
                            <div className="flex justify-between items-start">
                                <span className="opacity-50">[{log.timestamp}]</span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] font-bold uppercase">
                                    {log.service}
                                </span>
                            </div>
                            <div className="mt-1 font-semibold">{log.message}</div>
                            {log.data && (
                                <pre className="mt-2 text-[10px] bg-black/30 p-2 rounded overflow-x-auto border border-gray-800/50">
                                    {JSON.stringify(log.data, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function ConnectionsConfig({ preferences, onPreferenceChange }: {
    preferences: UserPreferences,
    onPreferenceChange: (key: keyof UserPreferences, value: any) => void
}) {
    const { toast } = useToast();
    const [loadingWA, setLoadingWA] = useState(false);
    const [loadingTG, setLoadingTG] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const addLog = (log: Omit<LogEntry, 'timestamp'>) => {
        setLogs(prev => [{
            ...log,
            timestamp: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 50));
    };

    const clearLogs = () => setLogs([]);

    const testWhatsApp = async () => {
        if (!preferences.whatsappTestNumber) {
            toast({ title: "Número faltante", description: "Configura el número de prueba primero.", variant: "destructive" });
            return;
        }
        setLoadingWA(true);
        addLog({
            service: 'whatsapp',
            type: 'request',
            message: `Iniciando test hacia ${preferences.whatsappTestNumber}...`,
            data: {
                target: preferences.whatsappTestNumber,
                type: 'template',
                template: 'jaspers_market_plain_text_v1'
            }
        });

        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: preferences.whatsappTestNumber,
                    template: {
                        name: "jaspers_market_plain_text_v1",
                        language: { code: "en_US" }
                    },
                    metadata: { type: 'test_connection' }
                })
            });
            const data = await res.json();

            if (data.success) {
                addLog({
                    service: 'whatsapp',
                    type: 'response',
                    message: '✅ ¡Mensaje Enviado!',
                    data: data.data
                });
                toast({ title: "WhatsApp Enviado", description: "Revisa tu teléfono." });
            } else {
                addLog({
                    service: 'whatsapp',
                    type: 'error',
                    message: '❌ Error en la API',
                    data: data.details || data.error
                });
                toast({ title: "Error", description: data.error || "Falla en la API de Meta", variant: "destructive" });
            }
        } catch (error: any) {
            addLog({
                service: 'whatsapp',
                type: 'error',
                message: '❌ Error de Conector',
                data: { message: error.message }
            });
            toast({ title: "Error", description: "No se pudo conectar con el servidor.", variant: "destructive" });
        } finally {
            setLoadingWA(false);
        }
    };

    const testTelegram = async () => {
        setLoadingTG(true);
        addLog({
            service: 'telegram',
            type: 'request',
            message: 'Enviando notificación de prueba...'
        });

        try {
            const res = await fetch('/api/telegram/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: "🚀 *Test de Conexión Telegram*\n\nSi lees esto, el Bot está configurado correctamente." })
            });
            const data = await res.json();
            if (data.success) {
                addLog({
                    service: 'telegram',
                    type: 'response',
                    message: '✅ Telegram Enviado',
                    data: { status: 'ok' }
                });
                toast({ title: "Telegram Enviado", description: "Revisa el chat del bot." });
            } else {
                addLog({
                    service: 'telegram',
                    type: 'error',
                    message: '❌ Error de Telegram',
                    data: data.error
                });
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch (error: any) {
            addLog({
                service: 'telegram',
                type: 'error',
                message: '❌ Error Crítico',
                data: error.message
            });
            toast({ title: "Error", description: "Error enviando a Telegram.", variant: "destructive" });
        } finally {
            setLoadingTG(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="text-blue-500" size={20} />
                        Pruebas de Conectividad
                    </CardTitle>
                    <CardDescription>
                        Valida que las credenciales de Meta y Telegram en tu .env.local sean correctas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Meta WhatsApp Test */}
                        <div className="p-6 bg-[#075e54]/10 border border-[#075e54]/30 rounded-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#25D366] rounded-lg">
                                    <MessageSquare className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Meta WhatsApp</h3>
                                    <p className="text-xs text-gray-400">Canal oficial (Cloud API)</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300">
                                Prueba enviando la plantilla oficial de Meta <strong>Market Plain Text</strong>.
                                <span className="text-[10px] block text-gray-500 mt-1">* Ideal para validar el número sin ventana de 24h.</span>
                            </p>
                            <Button
                                className="w-full bg-[#25D366] hover:bg-[#20b859] text-white gap-2 font-bold rounded-xl shadow-lg shadow-[#25D366]/20"
                                onClick={testWhatsApp}
                                disabled={loadingWA}
                            >
                                {loadingWA ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                                Probar WhatsApp
                            </Button>
                        </div>

                        {/* Telegram Test */}
                        <div className="p-6 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#0088cc] rounded-lg">
                                    <Send className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Telegram Bot</h3>
                                    <p className="text-xs text-gray-400">Alertas de gestión interna</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300">
                                Envía una notificación de prueba a tu canal o usuario de Telegram configurado.
                            </p>
                            <Button
                                className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white gap-2 font-bold rounded-xl shadow-lg shadow-[#0088cc]/20"
                                onClick={testTelegram}
                                disabled={loadingTG}
                            >
                                {loadingTG ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                                Probar Telegram
                            </Button>
                        </div>

                        {/* Instagram Config Redirect */}
                        <div className="p-6 bg-pink-500/10 border border-pink-500/30 rounded-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-500 rounded-lg">
                                    <Instagram className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Instagram Business</h3>
                                    <p className="text-xs text-gray-400">Mensajería Directa</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300">
                                Gestiona tus credenciales y vincula tu cuenta de empresa para el Inbox de Operaciones.
                            </p>
                            <Link href="/settings/instagram" className="block w-full">
                                <Button
                                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white gap-2 font-bold rounded-xl shadow-lg shadow-pink-500/20"
                                >
                                    <Settings size={16} />
                                    Configurar Instagram
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-amber-500" />
                                    Modo de Prueba (Goteo SEGURO)
                                </Label>
                                <p className="text-sm text-gray-400">
                                    Las misiones de Donna se enviarán ÚNICAMENTE a este número.
                                </p>
                            </div>
                            <Switch
                                checked={preferences.whatsappTestMode}
                                onCheckedChange={(checked) => onPreferenceChange('whatsappTestMode', checked)}
                            />
                        </div>

                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Número de Destino para Pruebas</Label>
                            <Input
                                value={preferences.whatsappTestNumber}
                                onChange={(e) => onPreferenceChange('whatsappTestNumber', e.target.value)}
                                className="bg-gray-900 border-gray-700 text-white mt-2"
                                placeholder="Ej: 5939..."
                            />
                            <p className="text-[10px] text-gray-500 mt-2">
                                Ingresa el número con código de país (Ej: 593 para Ecuador).
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <LogConsole logs={logs} onClear={clearLogs} />
        </div>
    );
}

export default function SettingsPage() {
    const { toast } = useToast();
    const [profile, setProfile] = useState<BusinessProfile>({
        companyName: '',
        address: '',
        phone: '',
        website: '',
        logoUrl: '',
    });

    const [preferences, setPreferences] = useState<UserPreferences>({
        monthlySalesGoal: 10000,
        currency: 'USD',
        emailNotifications: true,
        browserNotifications: true,
        autoBackup: true,
        whatsappTestMode: true,
        whatsappTestNumber: '593967491847',
    });

    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

    const [aiPersonality, setAiPersonality] = useState<string>('');

    useEffect(() => {
        try {
            // Load data from localStorage
            const savedProfile = localStorage.getItem('crm_business_profile');
            const savedPreferences = localStorage.getItem('crm_user_preferences');
            const savedBackupDate = localStorage.getItem('crm_last_backup_date');
            const savedAiPersona = localStorage.getItem('crm_ai_personality');

            if (savedProfile) setProfile(JSON.parse(savedProfile));
            if (savedPreferences) setPreferences(JSON.parse(savedPreferences));
            if (savedBackupDate) setLastBackupDate(savedBackupDate);
            if (savedAiPersona) setAiPersonality(savedAiPersona);
        } catch (error) {
            console.error("Error hydrating settings from localStorage:", error);
        }
    }, []);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = () => {
        localStorage.setItem('crm_business_profile', JSON.stringify(profile));
        localStorage.setItem('crm_user_preferences', JSON.stringify(preferences));
        localStorage.setItem('crm_ai_personality', aiPersonality);
        toast({
            title: "Configuración guardada",
            description: "Tus cambios se han aplicado correctamente.",
        });
    };

    const handleDownloadBackup = () => {
        // Simulate getting all data from local storage for now (simplest approach for this stack)
        // Ideally this would fetch from API, but user requested 'simple logic'.
        // We will dump the localStorage keys we know about + encourage API dump.

        // Actually, since we migrated to SQLite, a real backup should ideally trigger a server route
        // But for "Client Side Logic" requested, we will download what we can or mock the full backup
        // if the user wants to download the SQLite file, that is server side.

        // For now, let's download the localStorage data (legacy) + a marker.
        const backupData = {
            profile,
            preferences,
            timestamp: new Date().toISOString(),
            version: '1.0',
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `crm_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        const now = new Date().toISOString();
        setLastBackupDate(now);
        localStorage.setItem('crm_last_backup_date', now);

        toast({
            title: "Respaldo completado",
            description: "El archivo JSON se ha descargado a tu equipo.",
        });
    };

    const handleAutoBackupCheck = () => {
        // This function would be called by a layout effect globally, but we simulate it here
        if (preferences.autoBackup && lastBackupDate) {
            const last = new Date(lastBackupDate).getTime();
            const now = new Date().getTime();
            const hoursDiff = (now - last) / (1000 * 3600);

            if (hoursDiff > 24) {
                toast({
                    title: "Recordatorio de Respaldo",
                    description: "Han pasado más de 24 horas desde tu último respaldo automático.",
                    variant: "default",
                });
            }
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Configuración del Sistema</h1>
                    <p className="text-muted-foreground mt-2">Gestiona el perfil de tu negocio, preferencias y conexiones de IA.</p>
                </div>
                <Link href="/">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Home className="h-4 w-4" />
                        Ir al Inicio
                    </Button>
                </Link>
            </div>
            <div className="flex justify-between items-center mb-6">
                {/* This div was originally for the main title and save button.
                    The title part has been moved to the new header structure.
                    The save button remains here, potentially needing adjustment if it's meant to be part of the new header.
                    Based on the instruction, the save button is now in a separate flex container below the main header.
                */}
                {/* The original title div content is now part of the new header above. */}
                <Button onClick={saveSettings} className="gap-2">
                    <Save size={18} />
                    Guardar Cambios
                </Button>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="bg-gray-800 border-gray-700 text-gray-400">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white gap-2">
                        <Building size={16} /> Perfil de Negocio
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white gap-2">
                        <Settings size={16} /> Preferencias
                    </TabsTrigger>
                    <TabsTrigger value="system" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white gap-2">
                        <Database size={16} /> Sistema y Respaldo
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white gap-2">
                        <Bot size={16} /> IA y Cortex
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white gap-2">
                        <MessageSquare size={16} /> Omnicanalidad (WA/IG/TG)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle>Información del Negocio</CardTitle>
                            <CardDescription>Estos datos aparecerán en tus cotizaciones y documentos generados.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Nombre de la Empresa</Label>
                                    <Input
                                        id="companyName"
                                        name="companyName"
                                        value={profile.companyName}
                                        onChange={handleProfileChange}
                                        placeholder="Ej. Turismo Global S.A."
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono de Contacto</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={profile.phone}
                                        onChange={handleProfileChange}
                                        placeholder="+593 99..."
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Dirección Física</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        value={profile.address}
                                        onChange={handleProfileChange}
                                        placeholder="Av. Principal 123..."
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Sitio Web</Label>
                                    <Input
                                        id="website"
                                        name="website"
                                        value={profile.website}
                                        onChange={handleProfileChange}
                                        placeholder="www.miempresa.com"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label htmlFor="logoUrl">URL del Logo (Opcional)</Label>
                                    <Input
                                        id="logoUrl"
                                        name="logoUrl"
                                        value={profile.logoUrl}
                                        onChange={handleProfileChange}
                                        placeholder="https://..."
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle>Preferencias Generales</CardTitle>
                            <CardDescription>Personaliza tu experiencia en el CRM.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-800/50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Meta de Ventas Mensual</Label>
                                    <p className="text-sm text-gray-400">Objetivo para calcular el rendimiento en el Dashboard.</p>
                                </div>
                                <div className="w-[150px]">
                                    <Input
                                        type="number"
                                        value={preferences.monthlySalesGoal}
                                        onChange={(e) => handlePreferenceChange('monthlySalesGoal', Number(e.target.value))}
                                        className="bg-gray-800 border-gray-700 text-white text-right"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-800/50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Moneda Principal</Label>
                                    <p className="text-sm text-gray-400">Moneda utilizada para reportes financieros.</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-md border border-gray-700">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePreferenceChange('currency', 'USD')}
                                        className={preferences.currency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400'}
                                    >
                                        USD
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePreferenceChange('currency', 'MXN')}
                                        className={preferences.currency === 'MXN' ? 'bg-blue-600 text-white' : 'text-gray-400'}
                                    >
                                        MXN
                                    </Button>
                                </div>
                            </div>

                            <Separator className="bg-gray-800" />

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Respaldo Automático (Recordatorio)</Label>
                                    <p className="text-sm text-gray-400">Recibir recordatorio diario a las 12:00 PM si no se ha respaldado.</p>
                                </div>
                                <Switch
                                    checked={preferences.autoBackup}
                                    onCheckedChange={(checked) => handlePreferenceChange('autoBackup', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ai">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle>Personalidad de Cortex AI</CardTitle>
                            <CardDescription>Configura cómo quieres que se comporte tu Agente IA experto.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="aiPersonality">Instrucciones de Personalidad (El Toque de César)</Label>
                                <textarea
                                    id="aiPersonality"
                                    value={aiPersonality}
                                    onChange={(e) => setAiPersonality(e.target.value)}
                                    placeholder="Ej: Habla de forma muy directa y empresarial. Enfócate siempre en la rentabilidad."
                                    className="w-full min-h-[200px] p-4 bg-gray-800 border-gray-700 rounded-md text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    Estas instrucciones se inyectan en el prompt maestro de "Cortex" para ajustar su tono y prioridades.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="whatsapp">
                    <ConnectionsConfig preferences={preferences} onPreferenceChange={handlePreferenceChange} />
                </TabsContent>

                <TabsContent value="system">
                    <div className="grid gap-6">
                        <Card className="bg-gray-900 border-gray-800">
                            <CardHeader>
                                <CardTitle>Copia de Seguridad (Backup)</CardTitle>
                                <CardDescription>Descarga una copia de tus configuraciones y datos locales para estar seguro.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Database className="text-blue-500" size={24} />
                                        <div>
                                            <h4 className="font-medium text-blue-100">Estado del Respaldo</h4>
                                            <p className="text-sm text-blue-300">
                                                {lastBackupDate
                                                    ? `Último respaldo: ${new Date(lastBackupDate).toLocaleString()}`
                                                    : 'No se ha realizado ningún respaldo reciente.'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button onClick={handleDownloadBackup} variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/50">
                                        <Download className="mr-2" size={16} />
                                        Descargar JSON
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-red-600">
                            <CardHeader>
                                <CardTitle className="text-red-500 flex items-center gap-2">
                                    <AlertTriangle size={20} />
                                    Zona de Peligro
                                </CardTitle>
                                <CardDescription>Acciones irreversibles sobre tus datos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-400">Si deseas reiniciar la aplicación desde cero, eliminando todos los datos locales.</p>
                                    <Button variant="destructive" size="sm" onClick={() => toast({ title: "Acción bloqueada", description: "Por seguridad, contacta al administrador para un reset completo." })}>
                                        Resetear de Fábrica
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
