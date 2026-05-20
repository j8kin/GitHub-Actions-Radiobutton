import type { BranchPattern } from './types';
export declare function parseBranchPatterns(input: string): BranchPattern[];
export declare function shouldApplyToPR(headBranch: string, baseBranch: string, patterns: BranchPattern[]): boolean;
