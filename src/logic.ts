import type { RadioGroup } from './types';
import { parsePRBody } from './parser';

export function isAlreadyValid(groups: RadioGroup[]): boolean {
    return groups.every(group => group.checkboxes.filter(cb => cb.checked).length <= 1);
}

export function findFirstCheckedBox(group: RadioGroup): number | null {
    const idx = group.checkboxes.findIndex(cb => cb.checked);
    return idx === -1 ? null : idx;
}

function findMatchingGroup(prevGroups: RadioGroup[], currentGroup: RadioGroup): RadioGroup | null {
    if (currentGroup.name !== undefined) {
        const byName = prevGroups.find(g => g.name === currentGroup.name);
        if (byName) return byName;
    }
    // Fall back: match by positional index is handled at call site
    return null;
}

export function findNewlyCheckedBox(currentBody: string, previousBody: string, group: RadioGroup): number | null {
    const prevGroups = parsePRBody(previousBody).groups;
    const currentGroups = parsePRBody(currentBody).groups;

    let prevGroup: RadioGroup | null = null;

    if (group.name !== undefined) {
        prevGroup = findMatchingGroup(prevGroups, group);
    }

    if (prevGroup === null) {
        // Match by positional index in the current parse
        const currentIdx = currentGroups.findIndex(g => g.bodyStart === group.bodyStart && g.bodyEnd === group.bodyEnd);
        if (currentIdx !== -1 && currentIdx < prevGroups.length) {
            prevGroup = prevGroups[currentIdx];
        }
    }

    if (prevGroup === null) {
        const idx = group.checkboxes.findIndex(cb => cb.checked);
        return idx === -1 ? null : idx;
    }

    for (let i = 0; i < group.checkboxes.length; i++) {
        const cb = group.checkboxes[i];
        const prevCb = prevGroup.checkboxes[i];
        if (cb.checked && (prevCb === undefined || !prevCb.checked)) {
            return i;
        }
    }

    // Fallback: keep first checked
    const fallback = group.checkboxes.findIndex(cb => cb.checked);
    return fallback === -1 ? null : fallback;
}

export function enforceRadioGroups(
    body: string,
    groups: RadioGroup[],
    pickWinner: (group: RadioGroup) => number | null
): { newBody: string; changed: boolean } {
    const sorted = groups.slice().sort((a, b) => b.bodyStart - a.bodyStart);
    let result = body;
    let changed = false;

    for (const group of sorted) {
        const checkedCount = group.checkboxes.filter(c => c.checked).length;
        if (checkedCount <= 1) continue;

        const winnerIdx = pickWinner(group);
        if (winnerIdx === null) continue;

        let newBlock = group.rawBlock;
        const reversedCheckboxes = group.checkboxes.slice().sort((a, b) => b.markerStart - a.markerStart);

        for (const cb of reversedCheckboxes) {
            const originalIndex = group.checkboxes.indexOf(cb);
            if (cb.checked && originalIndex !== winnerIdx) {
                newBlock = newBlock.slice(0, cb.markerStart) + '[ ]' + newBlock.slice(cb.markerStart + 3);
                changed = true;
            }
        }

        result = result.slice(0, group.bodyStart) + newBlock + result.slice(group.bodyEnd);
    }

    return { newBody: result, changed };
}
