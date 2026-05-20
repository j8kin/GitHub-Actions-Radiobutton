import { parsePRBody } from '../src/parser';

describe('parsePRBody', () => {
    it('returns empty groups for body with no radio groups', () => {
        const result = parsePRBody('# Title\n- [x] item\n- [ ] item2');
        expect(result.groups).toHaveLength(0);
    });

    it('parses a single unnamed group', () => {
        const body = '<!-- radiobutton-group -->\n- [ ] A\n- [x] B\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups).toHaveLength(1);
        expect(result.groups[0].name).toBeUndefined();
        expect(result.groups[0].checkboxes).toHaveLength(2);
    });

    it('parses a named group', () => {
        const body = '<!-- radiobutton-group: env -->\n- [x] Dev\n<!-- /radiobutton-group: env -->';
        const result = parsePRBody(body);
        expect(result.groups[0].name).toBe('env');
    });

    it('parses group name with surrounding spaces', () => {
        const body = '<!-- radiobutton-group:  my group  -->\n- [x] A\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].name).toBe('my group');
    });

    it('parses multiple groups in sequence', () => {
        const body = [
            '<!-- radiobutton-group -->',
            '- [x] A',
            '<!-- /radiobutton-group -->',
            '<!-- radiobutton-group -->',
            '- [ ] B',
            '<!-- /radiobutton-group -->',
        ].join('\n');
        const result = parsePRBody(body);
        expect(result.groups).toHaveLength(2);
    });

    it('ignores checkboxes outside groups', () => {
        const body = '- [x] outside\n<!-- radiobutton-group -->\n- [x] inside\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].checkboxes).toHaveLength(1);
        expect(result.groups[0].checkboxes[0].raw).toContain('inside');
    });

    it('handles uppercase [X] as checked', () => {
        const body = '<!-- radiobutton-group -->\n- [X] Option\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].checkboxes[0].checked).toBe(true);
    });

    it('ignores malformed group with no closing tag', () => {
        const body = '<!-- radiobutton-group -->\n- [x] A';
        const result = parsePRBody(body);
        expect(result.groups).toHaveLength(0);
    });

    it('handles group with zero checkboxes', () => {
        const body = '<!-- radiobutton-group -->\nSome text\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].checkboxes).toHaveLength(0);
    });

    it('records correct globalOffset for checkboxes', () => {
        const prefix = 'Prefix text\n';
        const body = prefix + '<!-- radiobutton-group -->\n- [x] Item\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        const cb = result.groups[0].checkboxes[0];
        const markerChar = body[cb.globalOffset + cb.markerStart - result.groups[0].bodyStart];
        // globalOffset is the start of the checkbox line in the full body
        // the character at globalOffset + (markerStart relative to block) points to '['
        const absoluteMarker = result.groups[0].bodyStart + cb.markerStart;
        expect(body[absoluteMarker]).toBe('[');
    });

    it('handles asterisk bullet style', () => {
        const body = '<!-- radiobutton-group -->\n* [x] Asterisk\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].checkboxes[0].checked).toBe(true);
    });

    it('handles plus bullet style', () => {
        const body = '<!-- radiobutton-group -->\n+ [ ] Plus\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].checkboxes[0].checked).toBe(false);
    });

    it('handles indented checkboxes', () => {
        const body = '<!-- radiobutton-group -->\n  - [x] Indented\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].checkboxes).toHaveLength(1);
        expect(result.groups[0].checkboxes[0].checked).toBe(true);
    });

    it('correctly identifies checked vs unchecked', () => {
        const body = '<!-- radiobutton-group -->\n- [x] Yes\n- [ ] No\n<!-- /radiobutton-group -->';
        const result = parsePRBody(body);
        expect(result.groups[0].checkboxes[0].checked).toBe(true);
        expect(result.groups[0].checkboxes[1].checked).toBe(false);
    });

    it('sets bodyStart and bodyEnd correctly', () => {
        const body = 'Before\n<!-- radiobutton-group -->\n- [x] A\n<!-- /radiobutton-group -->\nAfter';
        const result = parsePRBody(body);
        const group = result.groups[0];
        expect(body[group.bodyStart]).toBe('<');
        expect(body.slice(group.bodyStart, group.bodyEnd)).toBe(group.rawBlock);
    });
});
