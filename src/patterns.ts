import { minimatch } from 'minimatch';
import type { BranchPattern } from './types';

export function parseBranchPatterns(input: string): BranchPattern[] {
    const lines = input
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));

    return lines.map(line => {
        if (line.includes('->')) {
            const [head, base] = line.split('->').map(s => s.trim());
            return { head, base };
        }
        return { head: line.trim(), base: '*' };
    });
}

export function shouldApplyToPR(headBranch: string, baseBranch: string, patterns: BranchPattern[]): boolean {
    if (patterns.length === 0) return true;

    return patterns.some(
        p => minimatch(headBranch, p.head, { dot: true }) && minimatch(baseBranch, p.base, { dot: true })
    );
}
