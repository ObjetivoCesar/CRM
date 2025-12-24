import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";
import { Lead } from "@/lib/types";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is missing in environment variables.");
    throw new Error("OPENAI_API_KEY is missing");
  }
  return new OpenAI({ apiKey });
};

const getPromptContent = (promptName: string): string => {
  try {
    const promptPath = join(process.cwd(), "lib", "prompts", `${promptName}.md`);
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error(`Error reading prompt ${promptName}:`, error);
    throw new Error(`Could not load prompt: ${promptName}`);
  }
};

const getProductCatalog = (): string => {
  try {
    const csvPath = join(process.cwd(), "lib", "data", "Servicios y Productos.csv");
    return readFileSync(csvPath, "utf-8");
  } catch (error) {
    console.error("Error reading product catalog:", error);
    throw new Error("Could not load product catalog");
  }
}

// Re-map Lead for Quotation Generator compatibility if needed, or use Partial<Lead>
type LeadData = Partial<Lead>;

export interface QuotationConfig {
  mentalTrigger: "TRANQUILIDAD" | "CONTROL" | "CRECIMIENTO" | "LEGADO";
  proposalFormat: "multiples_opciones" | "proceso_fases";
  selectedServices: string[];
  estimatedBudget: string;
  urgentPromotion?: string;
}

export class QuotationGenerator {
  async generateFullQuotation(leadData: LeadData, templateId: string = "plantilla_3_logico_extrovertido"): Promise<string> {

    let promptName = "prompt_cotizacion_roja"; // Default fallback
    if (templateId === "propuesta_comercial") {
      promptName = "prompt_propuesta_comercial";
    } else if (templateId === "plantilla_3_logico_extrovertido") {
      promptName = "prompt_cotizacion_roja";
    }

    let prompt = getPromptContent(promptName);

    // Common replacements
    const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    prompt = prompt.replace(/{{FECHA}}/g, currentDate);
    prompt = prompt.replace(/\[FECHA\]/g, currentDate); // Handle legacy format

    if (templateId === "propuesta_comercial") {
      // Specific mapping for Propuesta Comercial
      prompt = prompt.replace(/{{CLIENTE}}/g, leadData.contactName || "Cliente");
      prompt = prompt.replace(/{{NEGOCIO}}/g, leadData.businessName || "Su Negocio");

      const city = leadData.city || leadData.businessLocation || "Loja"; // Fallback to Loja as per context
      prompt = prompt.replace(/{{CIUDAD}}/g, city);

      const followers = leadData.facebookFollowers ? `${leadData.facebookFollowers} seguidores` : "N/A";
      prompt = prompt.replace(/{{INSTAGRAM}}/g, followers); // Using FB as proxy

      const reputationParts = [leadData.specificRecognitions, leadData.otherAchievements].filter(Boolean);
      const reputation = reputationParts.length > 0 ? reputationParts.join(". ") : "Reconocido en su sector";
      prompt = prompt.replace(/{{REPUTACION}}/g, reputation);

      const specialitiesParts = [leadData.businessActivity, (Array.isArray(leadData.interestedProduct) ? leadData.interestedProduct.join(", ") : leadData.interestedProduct)].filter(Boolean);
      const specialities = specialitiesParts.length > 0 ? specialitiesParts.join(". ") : "Gastronomía y eventos";
      prompt = prompt.replace(/{{ESPECIALIDADES}}/g, specialities);

      const location = leadData.address || leadData.businessLocation || "Ubicación céntrica";
      prompt = prompt.replace(/{{UBICACION}}/g, location);

    } else {
      // Legacy mapping for "prompt_cotizacion_roja"
      prompt = prompt.replace(/\[NOMBRE_CONTACTO\]/g, leadData.contactName || '');
      prompt = prompt.replace(/\[EMPRESA\]/g, leadData.businessName || '');
      prompt = prompt.replace(/\[ACTIVIDAD_COMERCIAL\]/g, leadData.businessActivity || '');
      // Inject full data JSON for the 'roja' prompt which asks for it at the end
      prompt = prompt.replace(/\[Aquí pegarás los datos del formulario de Recorridos\]/g, JSON.stringify(leadData, null, 2));
    }

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Error generating full quotation:", error);
      throw new Error("Failed to generate full quotation");
    }
  }

  async generateDescription(leadData: Partial<LeadData>, templateId: string): Promise<string> {
    const promptMap: { [key: string]: string } = {
      'plantilla_1_emocional_extrovertido': 'prompt_desc_emocional_extrovertido',
      'plantilla_2_emocional_introvertido': 'prompt_desc_emocional_introvertido',
      'plantilla_3_logico_extrovertido': 'prompt_desc_logico_extrovertido',
      'plantilla_4_logico_introvertido': 'prompt_desc_logico_introvertido',
    };

    const promptName = promptMap[templateId];
    if (!promptName) {
      throw new Error("Invalid templateId for description generation");
    }

    let prompt = getPromptContent(promptName);

    // Replace placeholders in the prompt
    for (const key in leadData) {
      const typedKey = key as keyof LeadData;
      const value = leadData[typedKey] || '';
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return response.choices[0]?.message?.content?.trim().replace(/^"|"$/g, '') || "";
    } catch (error) {
      console.error("Error generating description:", error);
      throw new Error("Failed to generate description");
    }
  }
}
