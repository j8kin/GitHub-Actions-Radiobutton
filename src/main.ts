import * as core from '@actions/core';
import * as github from '@actions/github';
import type { PullRequestEvent } from '@octokit/webhooks-types';
import { parseBranchPatterns, shouldApplyToPR } from './patterns';
import { parsePRBody } from './parser';
import { isAlreadyValid, enforceRadioGroups, findNewlyCheckedBox, findFirstCheckedBox } from './logic';
import type { RadioGroup } from './types';

async function run(): Promise<void> {
    try {
        const token = core.getInput('github-token', { required: true });
        const branchPatternInput = core.getInput('branch-patterns');

        const patterns = parseBranchPatterns(branchPatternInput);

        const octokit = github.getOctokit(token);
        const context = github.context;

        if (context.eventName !== 'pull_request') {
            core.info('Not a pull_request event, skipping.');
            return;
        }

        const payload = context.payload as PullRequestEvent;
        const action = payload.action;

        if (action !== 'opened' && action !== 'edited') {
            core.info(`Unsupported action type: ${action}, skipping.`);
            return;
        }

        const pr = payload.pull_request;
        const headBranch = pr.head.ref;
        const baseBranch = pr.base.ref;
        const currentBody = pr.body ?? '';
        const owner = context.repo.owner;
        const repo = context.repo.repo;
        const prNumber = pr.number;

        if (!shouldApplyToPR(headBranch, baseBranch, patterns)) {
            core.info(`PR #${prNumber} (${headBranch} -> ${baseBranch}) does not match branch patterns, skipping.`);
            return;
        }

        const parseResult = parsePRBody(currentBody);
        core.setOutput('group-count', String(parseResult.groups.length));

        if (parseResult.groups.length === 0) {
            core.info('No radio groups found in PR body, skipping.');
            core.setOutput('updated', 'false');
            return;
        }

        if (isAlreadyValid(parseResult.groups)) {
            core.info('All radio groups already valid (at most one checked per group), skipping.');
            core.setOutput('updated', 'false');
            return;
        }

        let previousBody: string | undefined = undefined;
        if (action === 'edited') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            previousBody = (payload.changes as any)?.body?.from;
        }

        function pickWinner(group: RadioGroup): number | null {
            if (action === 'edited' && previousBody !== undefined) {
                return findNewlyCheckedBox(currentBody, previousBody, group);
            }
            return findFirstCheckedBox(group);
        }

        const { newBody, changed } = enforceRadioGroups(currentBody, parseResult.groups, pickWinner);

        if (!changed) {
            core.info('No changes needed.');
            core.setOutput('updated', 'false');
            return;
        }

        await octokit.rest.pulls.update({
            owner,
            repo,
            pull_number: prNumber,
            body: newBody,
        });

        core.info(`Updated PR #${prNumber} body to enforce radio groups.`);
        core.setOutput('updated', 'true');
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

run();
