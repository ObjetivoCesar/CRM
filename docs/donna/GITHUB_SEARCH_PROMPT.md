# Prompt Técnico: Búsqueda de Código y Soluciones Open Source (Github)

Este prompt está diseñado para que la IA actúe como un "Headhunter de Código", buscando repositorios específicos y soluciones ya construidas que podamos integrar o clonar.

---

**PROMPT PARA IA:**

```text
Actúa como un Senior Open Source Scout y Arquitecto de Software. Estamos construyendo un sistema de agentes de IA ("Donna") integrado a un CRM (Next.js 14 + Supabase) que se comunica vía WhatsApp (Evolution API) y automatiza tareas con n8n.

**OBJETIVO:**
No quiero inventar el agua tibia. Tu misión es encontrar repositorios de GitHub, boilerplates o proyectos Open Source existentes que resuelvan partes críticas de esta arquitectura para acelerar nuestro desarrollo.

**INVESTIGACIÓN TÉCNICA REQUERIDA:**

1.  **Repositorios "All-in-One" de Agentes + WhatsApp:**
    *   Busca proyectos recientes (2024-2025) en GitHub que integren: `Next.js + OpenAI/LangChain + WhatsApp Webhooks`.
    *   *Keywords:* "AI Agent WhatsApp CRM", "Nextjs AI Starter Kit", "Whatsapp Automated Agent Open Source".
    *   Evalúa si existen proyectos como "Typebot" o forks de "Evolution API" que ya traigan lógica de agentes pre-construida.

2.  **Automatización con n8n (Blueprints):**
    *   Busca "n8n workflows" o "n8n blueprints" públicos (JSONs) diseñados para:
        *   Lead Qualification with LLM.
        *   WhatsApp Auto-Reply with Context (RAG).
        *   Social Media Content Generator pipeline.
    *   ¿Existe algún repositorio "awesome-n8n-workflows" que tenga estos flujos listos para importar?

3.  **Memoria y Contexto (RAG Ligero):**
    *   Necesitamos que Donna recuerde conversaciones pasadas.
    *   Busca librerías ligeras para Next.js/Supabase (`pgvector`) que faciliten implementar "Long-term Memory" para chats sin montar una infraestructura masiva.
    *   Ejemplos a validar: `Mem0`, `LangChain.js memory modules`.

4.  **Alternativas de "Orquestadores":**
    *   Si n8n es muy pesado, ¿qué opinas de usar *frameworks de código* como `FlowiseAI` o `LangFlow` embedbidos?
    *   Busca comparativas técnicas: "n8n vs Flowise vs LangFlow for WhatsApp Agents".

5.  **Validación de Stack:**
    *   Critica mi stack (Next.js Front + n8n Back Logic + Evolution API Gateway). ¿Hay algún "Tech Stack" más moderno o eficiente que estén usando los desarrolladores indie en 2025 para esto? (Ej: usar `Trigger.dev` en lugar de n8n).

**FORMATO DE RESPUESTA:**
*   **Tabla de Repositorios:** Link | Estrellas | Descripción | Pros/Contras.
*   **Recomendación de "Piezas de Lego":** Qué librerías específicas instalar mañana.
*   **Top 3 Projectos a Clonar:** Si tuvieras que empezar hoy y ahorrar 2 meses de trabajo, ¿con cuál repo harías `git clone`?
```
