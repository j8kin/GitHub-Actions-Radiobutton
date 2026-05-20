import type { RadioGroup } from './types';
export declare function isAlreadyValid(groups: RadioGroup[]): boolean;
export declare function findFirstCheckedBox(group: RadioGroup): number | null;
export declare function findNewlyCheckedBox(currentBody: string, previousBody: string, group: RadioGroup): number | null;
export declare function enforceRadioGroups(body: string, groups: RadioGroup[], pickWinner: (group: RadioGroup) => number | null): {
    newBody: string;
    changed: boolean;
};
