
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import WhatsAppApp from './_components/WhatsAppApp'

export default function WhatsAppPage() {
    return (
        <DashboardLayout>
            <div className="mb-4">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">WhatsApp App Integration</h1>
                <p className="text-sm text-muted-foreground">App nativa portada para gestión local de contactos.</p>
            </div>
            <WhatsAppApp />
        </DashboardLayout>
    )
}
