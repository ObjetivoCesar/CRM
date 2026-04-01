"use client"

import React, { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  RefreshCw, 
  Image as ImageIcon, 
  Instagram, 
  Facebook, 
  Send, 
  Clock,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SocialAccount {
  id: string
  platform: "facebook" | "instagram"
  accountName: string
  accountId: string
}

interface SocialPost {
  id: string
  content: string
  mediaUrls: string[]
  status: "scheduled" | "publishing" | "published" | "failed"
  scheduledFor: string
  accountId: string
  errorMessage?: string
}

export default function SchedulerPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const [isUploading, setIsUploading] = useState(false)

  // New Post State
  const [newPost, setNewPost] = useState({
    content: "",
    mediaUrl: "",
    accountId: "",
    scheduledFor: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  })

  useEffect(() => {
    fetchData()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/marketing/upload", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setNewPost(prev => ({ ...prev, mediaUrl: data.url }))
        toast.success("Imagen subida con éxito")
      } else {
        toast.error("Error al subir: " + data.error)
      }
    } catch (error) {
      toast.error("Fallo al subir archivo")
    } finally {
      setIsUploading(false)
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [accRes, postRes] = await Promise.all([
        fetch("/api/marketing/accounts"),
        fetch("/api/marketing/posts")
      ])
      
      const accData = await accRes.json()
      const postData = await postRes.json()

      if (accData.success) setAccounts(accData.accounts)
      if (postData.success) setPosts(postData.posts)
    } catch (error) {
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncAccounts = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/marketing/accounts", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast.success(`Sincronizadas ${data.accounts.length} cuentas`)
        fetchData()
      } else {
        toast.error("Error en sincronización: " + data.error)
      }
    } catch (error) {
      toast.error("Fallo al conectar con Meta")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.accountId || !newPost.content) {
      toast.error("Faltan datos obligatorios")
      return
    }

    try {
      const res = await fetch("/api/marketing/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPost,
          mediaUrls: newPost.mediaUrl ? [newPost.mediaUrl] : [],
          mediaType: "IMAGE"
        })
      })
      
      if (res.ok) {
        toast.success("Post programado con éxito")
        setNewPost({
          content: "",
          mediaUrl: "",
          accountId: "",
          scheduledFor: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        })
        fetchData()
      }
    } catch (error) {
      toast.error("Error al programar")
    }
  }

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/marketing/posts?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Post eliminado")
        fetchData()
      }
    } catch (error) {
      toast.error("Error al eliminar")
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white/40 p-4 rounded-2xl glass border border-white/20 shadow-sm">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Social Scheduler</h2>
            <p className="text-muted-foreground italic">Planifica y automatiza tu presencia en Meta</p>
          </div>
          <Button onClick={handleSyncAccounts} disabled={isSyncing} variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Meta"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Side */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Nuevo Contenido
                </CardTitle>
                <CardDescription>Crea un post para FB o IG</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cuenta de Destino</label>
                    <div className="grid grid-cols-1 gap-2">
                      {accounts.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2 border border-dashed rounded-lg bg-muted/20">
                          Sincroniza tus cuentas primero
                        </p>
                      ) : (
                        accounts.map(acc => (
                          <div 
                            key={acc.id}
                            onClick={() => setNewPost({ ...newPost, accountId: acc.id })}
                            className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                              newPost.accountId === acc.id 
                                ? "border-primary bg-primary/5 shadow-sm scale-[1.02]" 
                                : "border-white/20 hover:bg-white/40"
                            }`}
                          >
                            {acc.platform === "instagram" ? (
                              <Instagram className="h-5 w-5 mr-3 text-pink-600" />
                            ) : (
                              <Facebook className="h-5 w-5 mr-3 text-blue-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{acc.accountName}</span>
                              <span className="text-[10px] uppercase text-muted-foreground">{acc.platform}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Copy / Texto</label>
                    <Textarea 
                      placeholder="¿Qué quieres decir hoy?..." 
                      className="min-h-[120px] rounded-xl focus:ring-primary"
                      value={newPost.content}
                      onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL de Imagen (Pública)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="https://images.unsplash.com/..." 
                          className="pl-9 rounded-xl text-xs"
                          value={newPost.mediaUrl}
                          onChange={e => setNewPost({ ...newPost, mediaUrl: e.target.value })}
                        />
                      </div>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl aspect-square p-0 w-10 relative overflow-hidden"
                          disabled={isUploading}
                        >
                          <Plus className={`h-4 w-4 ${isUploading ? "animate-spin" : ""}`} />
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={handleFileUpload}
                            accept="image/*,video/*"
                          />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Programación</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="datetime-local" 
                        className="pl-9 rounded-xl"
                        value={newPost.scheduledFor}
                        onChange={e => setNewPost({ ...newPost, scheduledFor: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full rounded-xl py-6 text-base font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                    <Send className="mr-2 h-5 w-5" />
                    Programar Post
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List Side */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="scheduled" className="w-full">
              <TabsList className="bg-white/40 glass p-1 rounded-2xl mb-6">
                <TabsTrigger value="scheduled" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Próximos Posts
                  {posts.filter(p => p.status === 'scheduled').length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">
                      {posts.filter(p => p.status === 'scheduled').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="published" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="scheduled" className="space-y-4">
                {posts.filter(p => p.status === 'scheduled' || p.status === 'publishing').length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-white/20 glass border border-dashed rounded-3xl text-center">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">No hay posts programados</p>
                    <p className="text-xs text-muted-foreground mt-1">Usa el formulario de la izquierda para empezar</p>
                  </div>
                ) : (
                  posts.filter(p => p.status === 'scheduled' || p.status === 'publishing').map(post => (
                    <PostRow key={post.id} post={post} accounts={accounts} onDelete={handleDeletePost} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="published" className="space-y-4">
                {posts.filter(p => p.status === 'published' || p.status === 'failed').map(post => (
                  <PostRow key={post.id} post={post} accounts={accounts} onDelete={handleDeletePost} />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function PostRow({ post, accounts, onDelete }: { post: SocialPost, accounts: SocialAccount[], onDelete: (id: string) => void }) {
  const account = accounts.find(a => a.id === post.accountId)
  const isFailed = post.status === "failed"
  const isPublished = post.status === "published"
  const isPublishing = post.status === "publishing"

  return (
    <div className="flex items-center gap-4 bg-white/60 p-4 rounded-3xl glass border border-white/30 hover:border-primary/30 transition-all group overflow-hidden relative">
      {isPublishing && <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-pulse" />}
      
      {/* Media Preview */}
      <div className="h-20 w-20 rounded-2xl bg-muted/30 overflow-hidden shrink-0 border border-black/5">
        {post.mediaUrls?.[0] ? (
          <img src={post.mediaUrls[0]} alt="Post" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {account?.platform === "instagram" ? (
            <Instagram className="h-4 w-4 text-pink-600" />
          ) : (
            <Facebook className="h-4 w-4 text-blue-600" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{account?.accountName || "Cuenta Desconocida"}</span>
          
          <div className="ml-auto flex items-center gap-2">
            {isPublished && <Badge className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Publicado</Badge>}
            {isFailed && <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>}
            {isPublishing && <Badge className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">Publicando...</Badge>}
            {!isPublished && !isFailed && !isPublishing && (
              <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-bold">PROGRAMADO</span>
            )}
          </div>
        </div>
        
        <p className="text-sm font-medium line-clamp-2 text-gray-800 leading-relaxed">{post.content || "Sin contenido de texto"}</p>
        
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground font-semibold">
           <span className="flex items-center gap-1">
             <CalendarIcon className="h-3 w-3" />
             {format(new Date(post.scheduledFor), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
           </span>
           {isFailed && post.errorMessage && (
             <span className="text-red-500 text-[10px] truncate max-w-[200px]">({post.errorMessage})</span>
           )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(post.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
