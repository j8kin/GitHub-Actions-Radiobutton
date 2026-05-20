import { isAlreadyValid, findFirstCheckedBox, findNewlyCheckedBox, enforceRadioGroups } from '../src/logic';
import { parsePRBody } from '../src/parser';
import type { RadioGroup } from '../src/types';

function makeGroup(checkboxStates: boolean[], name?: string): RadioGroup {
    const lines = checkboxStates.map((checked, i) => `- [${checked ? 'x' : ' '}] Option ${i}`);
    const rawBlock = `<!-- radiobutton-group${name ? ': ' + name : ''} -->\n${lines.join('\n')}\n<!-- /radiobutton-group -->`;
    return parsePRBody(rawBlock).groups[0];
}

describe('isAlreadyValid', () => {
    it('returns true for empty groups array', () => {
        expect(isAlreadyValid([])).toBe(true);
    });

    it('returns true when all groups have 0 checked', () => {
        const group = makeGroup([false, false]);
        expect(isAlreadyValid([group])).toBe(true);
    });

    it('returns true when all groups have exactly 1 checked', () => {
        const group = makeGroup([false, true, false]);
        expect(isAlreadyValid([group])).toBe(true);
    });

    it('returns false when any group has 2 checked', () => {
        const group = makeGroup([true, true]);
        expect(isAlreadyValid([group])).toBe(false);
    });

    it('returns false when any group has 3 checked', () => {
        const group = makeGroup([true, true, true]);
        expect(isAlreadyValid([group])).toBe(false);
    });
});

describe('findFirstCheckedBox', () => {
    it('returns null when no checkboxes are checked', () => {
        const group = makeGroup([false, false]);
        expect(findFirstCheckedBox(group)).toBeNull();
    });

    it('returns 0 when first checkbox is checked', () => {
        const group = makeGroup([true, false]);
        expect(findFirstCheckedBox(group)).toBe(0);
    });

    it('returns index of first checked when multiple are checked', () => {
        const group = makeGroup([false, true, true]);
        expect(findFirstCheckedBox(group)).toBe(1);
    });
});

describe('findNewlyCheckedBox', () => {
    it('returns index of box that changed from unchecked to checked', () => {
        const prevBody = '<!-- radiobutton-group -->\n- [ ] A\n- [ ] B\n- [ ] C\n<!-- /radiobutton-group -->';
        const currBody = '<!-- radiobutton-group -->\n- [ ] A\n- [x] B\n- [ ] C\n<!-- /radiobutton-group -->';
        const group = parsePRBody(currBody).groups[0];
        expect(findNewlyCheckedBox(currBody, prevBody, group)).toBe(1);
    });

    it('returns null when no change detected in checkbox states', () => {
        const body = '<!-- radiobutton-group -->\n- [ ] A\n- [ ] B\n<!-- /radiobutton-group -->';
        const group = parsePRBody(body).groups[0];
        expect(findNewlyCheckedBox(body, body, group)).toBeNull();
    });

    it('falls back to first checked when previous body has no matching group', () => {
        const prevBody = 'No groups here';
        const currBody = '<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group -->';
        const group = parsePRBody(currBody).groups[0];
        const result = findNewlyCheckedBox(currBody, prevBody, group);
        expect(result).toBe(0);
    });

    it('falls back to first checked when newly-checked cannot be identified', () => {
        // Both were already checked in prev — can't identify which is "newly" checked
        const prevBody = '<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group -->';
        const currBody = '<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group -->';
        const group = parsePRBody(currBody).groups[0];
        const result = findNewlyCheckedBox(currBody, prevBody, group);
        expect(result).toBe(0);
    });
});

describe('enforceRadioGroups', () => {
    it('unchecks all boxes except winner in a single group', () => {
        const body = '<!-- radiobutton-group -->\n- [x] A\n- [x] B\n- [x] C\n<!-- /radiobutton-group -->';
        const groups = parsePRBody(body).groups;
        const { newBody } = enforceRadioGroups(body, groups, () => 1);
        const result = parsePRBody(newBody).groups[0];
        expect(result.checkboxes[0].checked).toBe(false);
        expect(result.checkboxes[1].checked).toBe(true);
        expect(result.checkboxes[2].checked).toBe(false);
    });

    it('leaves unchecked boxes unchanged', () => {
        const body = '<!-- radiobutton-group -->\n- [x] A\n- [ ] B\n- [x] C\n<!-- /radiobutton-group -->';
        const groups = parsePRBody(body).groups;
        const { newBody } = enforceRadioGroups(body, groups, () => 0);
        const result = parsePRBody(newBody).groups[0];
        expect(result.checkboxes[0].checked).toBe(true);
        expect(result.checkboxes[1].checked).toBe(false);
        expect(result.checkboxes[2].checked).toBe(false);
    });

    it('does not modify checkboxes outside groups', () => {
        const body = '- [x] outside\n<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group -->';
        const groups = parsePRBody(body).groups;
        const { newBody } = enforceRadioGroups(body, groups, () => 0);
        expect(newBody.startsWith('- [x] outside')).toBe(true);
    });

    it('handles multiple groups independently', () => {
        const body = [
            '<!-- radiobutton-group -->',
            '- [x] A',
            '- [x] B',
            '<!-- /radiobutton-group -->',
            '<!-- radiobutton-group -->',
            '- [x] C',
            '- [x] D',
            '<!-- /radiobutton-group -->',
        ].join('\n');
        const groups = parsePRBody(body).groups;
        // winner 0 for first group, winner 1 for second group
        const { newBody } = enforceRadioGroups(body, groups, group => {
            return group === groups[0] ? 0 : 1;
        });
        const result = parsePRBody(newBody);
        expect(result.groups[0].checkboxes[0].checked).toBe(true);
        expect(result.groups[0].checkboxes[1].checked).toBe(false);
        expect(result.groups[1].checkboxes[0].checked).toBe(false);
        expect(result.groups[1].checkboxes[1].checked).toBe(true);
    });

    it('returns changed=false when only one box was already checked', () => {
        const body = '<!-- radiobutton-group -->\n- [x] A\n- [ ] B\n<!-- /radiobutton-group -->';
        const groups = parsePRBody(body).groups;
        const { changed } = enforceRadioGroups(body, groups, () => 0);
        expect(changed).toBe(false);
    });

    it('returns changed=false when no boxes were checked', () => {
        const body = '<!-- radiobutton-group -->\n- [ ] A\n- [ ] B\n<!-- /radiobutton-group -->';
        const groups = parsePRBody(body).groups;
        const { changed } = enforceRadioGroups(body, groups, () => null);
        expect(changed).toBe(false);
    });

    it('preserves the rest of the body text exactly', () => {
        const before = 'Header text\n\n';
        const after = '\n\nFooter text';
        const body = before + '<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group -->' + after;
        const groups = parsePRBody(body).groups;
        const { newBody } = enforceRadioGroups(body, groups, () => 0);
        expect(newBody.startsWith(before)).toBe(true);
        expect(newBody.endsWith(after)).toBe(true);
    });

    it('handles groups at the start of the body', () => {
        const body = '<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group -->\nAfter';
        const groups = parsePRBody(body).groups;
        const { newBody, changed } = enforceRadioGroups(body, groups, () => 0);
        expect(changed).toBe(true);
        expect(newBody.endsWith('\nAfter')).toBe(true);
    });

    it('handles groups at the end of the body', () => {
        const body = 'Before\n<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group -->';
        const groups = parsePRBody(body).groups;
        const { newBody, changed } = enforceRadioGroups(body, groups, () => 1);
        expect(changed).toBe(true);
        expect(newBody.startsWith('Before\n')).toBe(true);
    });

    it('handles consecutive groups with no text between them', () => {
        const body =
            '<!-- radiobutton-group -->\n- [x] A\n- [x] B\n<!-- /radiobutton-group --><!-- radiobutton-group -->\n- [x] C\n- [x] D\n<!-- /radiobutton-group -->';
        const groups = parsePRBody(body).groups;
        const { newBody, changed } = enforceRadioGroups(body, groups, () => 0);
        expect(changed).toBe(true);
        const result = parsePRBody(newBody);
        expect(result.groups).toHaveLength(2);
    });
});

describe('Integration (full body round-trip)', () => {
    it('full body: single group, two checked, keeps winner', () => {
        const body = [
            '## PR Description',
            '',
            'Please select environment:',
            '',
            '<!-- radiobutton-group: env -->',
            '- [x] Production',
            '- [x] Staging',
            '- [ ] Development',
            '<!-- /radiobutton-group: env -->',
            '',
            'Some other text here',
        ].join('\n');

        const groups = parsePRBody(body).groups;
        const { newBody, changed } = enforceRadioGroups(body, groups, () => 1);

        expect(changed).toBe(true);

        const result = parsePRBody(newBody);
        const checkedBoxes = result.groups[0].checkboxes.filter(cb => cb.checked);
        expect(checkedBoxes).toHaveLength(1);
        expect(checkedBoxes[0].raw).toContain('Staging');

        // Text outside group is preserved
        expect(newBody).toContain('## PR Description');
        expect(newBody).toContain('Some other text here');
        expect(newBody).toContain('- [ ] Development');
    });
});
