import type { ParseResult, RadioGroup } from './types';

// Add \s* before --> to allow spaces between the group name/tag and the closing -->
const OPEN_RE = /<!--\s*radiobutton-group(?:\s*:\s*([^-](?:[^-]|-(?!->))*))?(\s*)-->/gi;
const CLOSE_RE = /<!--\s*\/radiobutton-group(?:\s*:\s*([^-](?:[^-]|-(?!->))*))?(\s*)-->/gi;
// \S.* captures the full label text (not just the first character)
const CHECKBOX_RE = /^[ \t]*[-*+][ \t]+\[([xX ])\][ \t]+\S.*/gm;

export function parsePRBody(body: string): ParseResult {
    const groups: RadioGroup[] = [];
    OPEN_RE.lastIndex = 0;

    let openMatch: RegExpExecArray | null;
    while ((openMatch = OPEN_RE.exec(body)) !== null) {
        const openEnd = openMatch.index + openMatch[0].length;
        const groupName = openMatch[1]?.trim() ?? undefined;

        CLOSE_RE.lastIndex = openEnd;
        const closeMatch = CLOSE_RE.exec(body);
        if (closeMatch === null) break;

        const blockStart = openMatch.index;
        const blockEnd = closeMatch.index + closeMatch[0].length;
        const rawBlock = body.slice(blockStart, blockEnd);

        const checkboxes: RadioGroup['checkboxes'] = [];
        CHECKBOX_RE.lastIndex = 0;
        let cbMatch: RegExpExecArray | null;
        while ((cbMatch = CHECKBOX_RE.exec(rawBlock)) !== null) {
            const globalOffset = blockStart + cbMatch.index;
            const checked = cbMatch[1] !== ' ';
            const markerStart = cbMatch.index + cbMatch[0].indexOf('[');
            checkboxes.push({ raw: cbMatch[0], checked, markerStart, globalOffset });
        }

        groups.push({
            name: groupName,
            bodyStart: blockStart,
            bodyEnd: blockEnd,
            rawBlock,
            checkboxes,
        });

        OPEN_RE.lastIndex = blockEnd;
    }

    return { groups };
}
