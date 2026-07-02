import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let createCommitStatus = SlateTool.create(spec, {
  name: 'Create Commit Status',
  key: 'create_commit_status',
  description: `Create a status check on a specific commit. Useful for integrating CI/CD results, deployment status, or other external checks.
Also supports reading the combined status of all checks for a given ref.`,
  instructions: [
    'Use action "create" to set a status on a commit SHA.',
    'Use action "get" to retrieve the combined status for a ref (branch, tag, or SHA).'
  ]
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      action: z.enum(['create', 'get']).describe('Action to perform'),
      ref: z.string().describe('Commit SHA (for create) or branch/tag/SHA (for get)'),
      state: z
        .enum(['error', 'failure', 'pending', 'success'])
        .optional()
        .describe('Status state (required for create)'),
      targetUrl: z.string().optional().describe('URL to link from the status (for create)'),
      description: z
        .string()
        .optional()
        .describe('Short description of the status (for create)'),
      context: z
        .string()
        .optional()
        .describe('Label to differentiate statuses (for create, default: "default")')
    })
  )
  .output(
    z.object({
      state: z.string().describe('Status state'),
      totalCount: z.number().optional().describe('Total number of statuses (for get)'),
      statuses: z
        .array(
          z.object({
            state: z.string(),
            context: z.string(),
            description: z.string().nullable(),
            targetUrl: z.string().nullable(),
            createdAt: z.string()
          })
        )
        .optional()
        .describe('Individual statuses (for get)'),
      statusId: z.number().optional().describe('Created status ID'),
      htmlUrl: z.string().optional().describe('URL to the status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, action, ref } = ctx.input;

    if (action === 'get') {
      let combined = await client.getCombinedStatus(owner, repo, ref);
      return {
        output: {
          state: combined.state,
          totalCount: combined.total_count,
          statuses: combined.statuses.map((s: any) => ({
            state: s.state,
            context: s.context,
            description: s.description,
            targetUrl: s.target_url,
            createdAt: s.created_at
          }))
        },
        message: `Combined status for \`${ref}\`: **${combined.state}** (${combined.total_count} checks).`
      };
    }

    if (!ctx.input.state) throw new Error('state is required for create action.');

    let status = await client.createCommitStatus(owner, repo, ref, {
      state: ctx.input.state,
      targetUrl: ctx.input.targetUrl,
      description: ctx.input.description,
      context: ctx.input.context
    });

    return {
      output: {
        state: status.state,
        statusId: status.id,
        htmlUrl: status.url
      },
      message: `Set commit status **${status.state}** on \`${ref.slice(0, 7)}\` in **${owner}/${repo}** (context: ${status.context}).`
    };
  })
  .build();
