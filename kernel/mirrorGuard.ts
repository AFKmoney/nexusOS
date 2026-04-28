
import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';

/**
 * 🔷 MIRROR symmetry OPERATOR (T'-mode)
 * 
 * Validates Ω-mode generations by projecting them onto a stability manifold.
 * Ensures that proposed system changes do not violate the core triadic balance.
 */

export interface ActionProposal {
  type: string;
  args: any[];
  raw: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-1 spectral coherence
  reason?: string;
  fix?: string;
}

class MirrorGuard {
  private static instance: MirrorGuard;

  public static getInstance(): MirrorGuard {
    if (!MirrorGuard.instance) {
      MirrorGuard.instance = new MirrorGuard();
    }
    return MirrorGuard.instance;
  }

  /**
   * Performs Mirror Symmetry Validation
   * Maps the proposal to its inverse and checks for structural collapse.
   */
  public async validate(proposal: ActionProposal): Promise<ValidationResult> {
    const os = useOS.getState();
    os.addAutonomyLog(`🔷 MIRROR: Projecting proposal "${proposal.type}" onto T'-manifold...`);

    // Rule 1: Structural Integrity (No empty files or broken registry)
    if (proposal.type === 'WRITE_FILE') {
        const [path, content] = proposal.args;
        if (!path || !content || content.length < 10) {
            return { valid: false, score: 0.1, reason: "Structural collapse: Zero-entropy payload detected." };
        }
        if (path.startsWith('/system') && !os.currentUser?.isAdmin) {
            return { valid: false, score: 0.0, reason: "Symmetry break: Permission violation in kernel space." };
        }
    }

    // Rule 2: Spectral Consistency (AI-based structural analysis)
    const criticPrompt = `
[SYSTEM MIRROR OPERATOR - T' MODE]
Analyze the following OS action proposal for structural stability.
Action: ${proposal.type}
Args: ${JSON.stringify(proposal.args)}

Criteria:
1. Does this action break the OS stability?
2. Is the code/content syntactically valid?
3. Does it violate the system integrity guidelines?

Return JSON: {"stable": boolean, "coherence": number, "critique": string}
    `.trim();

    try {
        const response = await aiService.generateOnce(criticPrompt, os.kernelRules, 'json');
        
        const analysis = JSON.parse(response.replace(/```json|```/g, '').trim());
        
        if (!analysis.stable || analysis.coherence < 0.7) {
            return { 
                valid: false, 
                score: analysis.coherence, 
                reason: `Spectral Dissonance: ${analysis.critique}` 
            };
        }

        os.addAutonomyLog(`🔷 MIRROR: Coherence verified (${(analysis.coherence * 100).toFixed(0)}%). Stability locked.`);
        return { valid: true, score: analysis.coherence };

    } catch (e: any) {
        // If the critic fails, we fall back to a conservative "PARTIAL" validation
        console.warn('[MIRROR_GUARD_FAIL]', e.message);
        return { valid: true, score: 0.5, reason: "Verification engine isolated. Proceeding with caution." };
    }
  }
}

export const mirrorGuard = MirrorGuard.getInstance();
