import { parseBranchPatterns, shouldApplyToPR } from '../src/patterns';

describe('parseBranchPatterns', () => {
    it('returns empty array for empty string', () => {
        expect(parseBranchPatterns('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
        expect(parseBranchPatterns('   \n   \n  ')).toEqual([]);
    });

    it('parses single "head -> base" pattern', () => {
        const result = parseBranchPatterns('feature/** -> main');
        expect(result).toEqual([{ head: 'feature/**', base: 'main' }]);
    });

    it('parses multiple patterns (newline-separated)', () => {
        const result = parseBranchPatterns('* -> main\nfeature/** -> develop');
        expect(result).toEqual([
            { head: '*', base: 'main' },
            { head: 'feature/**', base: 'develop' },
        ]);
    });

    it('parses pattern with no arrow (defaults base to *)', () => {
        const result = parseBranchPatterns('hotfix/*');
        expect(result).toEqual([{ head: 'hotfix/*', base: '*' }]);
    });

    it('trims whitespace from pattern parts', () => {
        const result = parseBranchPatterns('  feature/**  ->  main  ');
        expect(result).toEqual([{ head: 'feature/**', base: 'main' }]);
    });

    it('ignores lines starting with #', () => {
        const result = parseBranchPatterns('# comment\n* -> main');
        expect(result).toEqual([{ head: '*', base: 'main' }]);
    });

    it('ignores blank lines', () => {
        const result = parseBranchPatterns('\n\n* -> main\n\n');
        expect(result).toEqual([{ head: '*', base: 'main' }]);
    });
});

describe('shouldApplyToPR', () => {
    it('returns true when patterns array is empty (apply to all)', () => {
        expect(shouldApplyToPR('feature/foo', 'main', [])).toBe(true);
    });

    it('returns true when head and base both match a pattern', () => {
        const patterns = parseBranchPatterns('* -> main');
        expect(shouldApplyToPR('my-branch', 'main', patterns)).toBe(true);
    });

    it('returns false when head matches but base does not', () => {
        const patterns = parseBranchPatterns('* -> main');
        expect(shouldApplyToPR('feature/foo', 'develop', patterns)).toBe(false);
    });

    it('returns false when base matches but head does not', () => {
        const patterns = parseBranchPatterns('feature/** -> main');
        expect(shouldApplyToPR('hotfix/bug', 'main', patterns)).toBe(false);
    });

    it('returns true when any one of multiple patterns matches', () => {
        const patterns = parseBranchPatterns('* -> main\nfeature/** -> develop');
        expect(shouldApplyToPR('feature/login', 'develop', patterns)).toBe(true);
        // 'hotfix' (no slash) matches '* -> main'
        expect(shouldApplyToPR('hotfix', 'main', patterns)).toBe(true);
    });

    it('handles ** glob for feature branches', () => {
        const patterns = parseBranchPatterns('feature/** -> main');
        expect(shouldApplyToPR('feature/login', 'main', patterns)).toBe(true);
        expect(shouldApplyToPR('feature/team/login', 'main', patterns)).toBe(true);
        expect(shouldApplyToPR('hotfix/x', 'main', patterns)).toBe(false);
    });

    it('handles * wildcard', () => {
        const patterns = parseBranchPatterns('* -> main');
        expect(shouldApplyToPR('main', 'main', patterns)).toBe(true);
        expect(shouldApplyToPR('develop', 'main', patterns)).toBe(true);
        // * does not match slashes
        expect(shouldApplyToPR('feature/foo', 'main', patterns)).toBe(false);
    });

    it('handles case sensitivity (branch names are case-sensitive)', () => {
        const patterns = parseBranchPatterns('* -> main');
        expect(shouldApplyToPR('feature', 'Main', patterns)).toBe(false);
    });

    it('handles hotfix/* pattern matching only one level deep', () => {
        const patterns = parseBranchPatterns('hotfix/*');
        expect(shouldApplyToPR('hotfix/123', 'any-base', patterns)).toBe(true);
        expect(shouldApplyToPR('hotfix/deep/path', 'any-base', patterns)).toBe(false);
    });
});
