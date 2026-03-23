
import { aiService } from '../services/puterService';
import { KernelRules } from '../types';

export const NeuralEngine = {
    async getCompletion(textBefore: string, textAfter: string, context: string, rules: KernelRules) {
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
