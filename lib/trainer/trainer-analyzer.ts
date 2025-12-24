import { getOpenAIClient } from "@/lib/openai/client";
import { readFileSync } from "fs";
import { join } from "path";

export class TrainerAnalyzer {
    private getPrompt(agentName: string) {
        const path = join(process.cwd(), "lib", "prompts", "trainer_agents.md");
        const content = readFileSync(path, "utf-8");
        const sections = content.split("---");
        if (agentName === "metrics") return sections[0];
        if (agentName === "feedback") return sections[1];
        return "";
    }

    async analyzeCall(transcription: string) {
        const client = getOpenAIClient();

        // 1. Agente 2: Metrics
        const metricsPrompt = `${this.getPrompt("metrics")}\n\nTRANSCRIPCIÓN:\n${transcription}`;
        const metricsRes = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: metricsPrompt }],
            response_format: { type: "json_object" },
        });
        const metricsData = JSON.parse(metricsRes.choices[0].message.content || "{}");

        // 2. Agente 3: Feedback
        const feedbackPrompt = `${this.getPrompt("feedback")}\n\nANÁLISIS PREVIO:\n${JSON.stringify(metricsData)}\n\nTRANSCRIPCIÓN:\n${transcription}`;
        const feedbackRes = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: feedbackPrompt }],
            response_format: { type: "json_object" },
        });
        const feedbackData = JSON.parse(feedbackRes.choices[0].message.content || "{}");

        return {
            metrics: metricsData,
            feedback: feedbackData
        };
    }
}
