export interface Checkbox {
    raw: string;
    checked: boolean;
    markerStart: number;
}
export interface RadioGroup {
    name?: string;
    bodyStart: number;
    bodyEnd: number;
    rawBlock: string;
    checkboxes: Array<Checkbox & {
        globalOffset: number;
    }>;
}
export interface ParseResult {
    groups: RadioGroup[];
}
export interface BranchPattern {
    head: string;
    base: string;
}
