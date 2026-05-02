
import { aiService, aiGateway } from '../services/puterService';
import { KernelRules } from '../types';

export const NeuralEngine = {
    async getCompletion(textBefore: string, textAfter: string, context: string, rules: KernelRules) {
        const provider = aiGateway.getActiveProvider();

        // If the active provider natively supports FIM, use the specialized endpoint
        if (provider && (provider.id === 'mistral' || provider.id === 'codestral')) {
            try {
                const res = await aiGateway.fimCompletion(textBefore, textAfter, provider.defaultModel);
                return res.replace(/```[a-z]*\n?|```$/gi, '').trim();
            } catch (error) {
                console.warn('[NeuralEngine] FIM generation failed, falling back to standard completion', error);
            }
        }

        // Standard completion fallback
        const prompt = `
            Task: Inline code completion.
            Context: ${context}
            Before: ${textBefore}
            After: ${textAfter}
            Rule: Return ONLY code. No markdown.
        `;
        const res = await aiService.generateOnce(prompt, rules);
        return res.replace(/```[a-z]*\n?|```$/gi, '').trim();
    }
};
