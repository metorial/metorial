import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

let runnerLabelSchema = z.object({
  labelId: z.number().optional().describe('Label ID'),
  name: z.string().describe('Label name'),
  type: z.string().optional().describe('Label type (read-only or custom)')
});

let runnerSchema = z.object({
  runnerId: z.number().describe('Runner ID'),
  name: z.string().describe('Runner name'),
  os: z.string().describe('Operating system'),
  status: z.string().describe('Runner status (online, offline)'),
  busy: z.boolean().describe('Whether the runner is currently executing a job'),
  labels: z.array(runnerLabelSchema).describe('Runner labels')
});

export let manageRunners = SlateTool.create(spec, {
  name: 'Manage Runners',
  key: 'manage_runners',
  description: `List, inspect, remove, and manage self-hosted runners at the repository or organization level. Create registration and removal tokens, and manage custom labels on runners.`,
  instructions: [
    'Use scope "repo" with owner and repo for repository-level runners.',
    'Use scope "org" with org for organization-level runners.',
    'Registration tokens are used to configure new self-hosted runners.',
    'Removal tokens are used to securely remove runners.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      scope: z.enum(['repo', 'org']).describe('Runner scope level'),
      owner: z.string().optional().describe('Repository owner, required for repo scope'),
      repo: z.string().optional().describe('Repository name, required for repo scope'),
      org: z.string().optional().describe('Organization name, required for org scope'),
      action: z
        .enum([
          'list',
          'get',
          'remove',
          'create_registration_token',
          'create_removal_token',
          'list_labels',
          'add_labels',
          'set_labels',
          'remove_label'
        ])
        .describe('Action to perform'),
      runnerId: z
        .number()
        .optional()
        .describe('Runner ID, required for get/remove/label operations'),
      labels: z.array(z.string()).optional().describe('Labels to add or set'),
      labelName: z.string().optional().describe('Label name to remove'),
      name: z.string().optional().describe('Filter runners by name'),
      perPage: z.number().optional().describe('Results per page'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      runners: z.array(runnerSchema).optional().describe('List of runners'),
      totalCount: z.number().optional().describe('Total number of runners'),
      runner: runnerSchema.optional().describe('Single runner details'),
      removed: z.boolean().optional().describe('Whether the runner was removed'),
      registrationToken: z.string().optional().describe('Runner registration token'),
      removalToken: z.string().optional().describe('Runner removal token'),
      tokenExpiresAt: z.string().optional().describe('Token expiration timestamp'),
      labels: z.array(runnerLabelSchema).optional().describe('Runner labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { scope, owner, repo, org, action, runnerId } = ctx.input;

    let mapRunner = (r: any) => ({
      runnerId: r.id,
      name: r.name,
      os: r.os,
      status: r.status,
      busy: r.busy,
      labels: (r.labels ?? []).map((l: any) => ({
        labelId: l.id,
        name: l.name,
        type: l.type
      }))
    });

    let mapLabels = (data: any) =>
      (data.labels ?? []).map((l: any) => ({
        labelId: l.id,
        name: l.name,
        type: l.type
      }));

    if (action === 'list') {
      let data: any;
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        data = await client.listOrgRunners(org, {
          perPage: ctx.input.perPage,
          page: ctx.input.page,
          name: ctx.input.name
        });
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        data = await client.listRepoRunners(owner, repo, {
          perPage: ctx.input.perPage,
          page: ctx.input.page,
          name: ctx.input.name
        });
      }
      return {
        output: {
          runners: (data.runners ?? []).map(mapRunner),
          totalCount: data.total_count
        },
        message: `Found **${data.total_count}** runners.`
      };
    }

    if (action === 'get') {
      if (!runnerId) throw new Error('runnerId is required.');
      let runner: any;
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        runner = await client.getOrgRunner(org, runnerId);
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        runner = await client.getRepoRunner(owner, repo, runnerId);
      }
      return {
        output: { runner: mapRunner(runner) },
        message: `Runner **${runner.name}** is **${runner.status}**${runner.busy ? ' (busy)' : ''}.`
      };
    }

    if (action === 'remove') {
      if (!runnerId) throw new Error('runnerId is required.');
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        await client.removeOrgRunner(org, runnerId);
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        await client.removeRepoRunner(owner, repo, runnerId);
      }
      return {
        output: { removed: true },
        message: `Removed runner **${runnerId}**.`
      };
    }

    if (action === 'create_registration_token') {
      let data: any;
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        data = await client.createOrgRunnerRegistrationToken(org);
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        data = await client.createRepoRunnerRegistrationToken(owner, repo);
      }
      return {
        output: { registrationToken: data.token, tokenExpiresAt: data.expires_at },
        message: `Created runner registration token (expires ${data.expires_at}).`
      };
    }

    if (action === 'create_removal_token') {
      let data: any;
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        data = await client.createOrgRunnerRemovalToken(org);
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        data = await client.createRepoRunnerRemovalToken(owner, repo);
      }
      return {
        output: { removalToken: data.token, tokenExpiresAt: data.expires_at },
        message: `Created runner removal token (expires ${data.expires_at}).`
      };
    }

    if (action === 'list_labels') {
      if (!runnerId || !owner || !repo)
        throw new Error('runnerId, owner, and repo are required.');
      let data = await client.listRunnerLabels(owner, repo, runnerId);
      return {
        output: { labels: mapLabels(data) },
        message: `Runner has **${data.labels?.length ?? 0}** labels.`
      };
    }

    if (action === 'add_labels') {
      if (!runnerId || !ctx.input.labels || !owner || !repo)
        throw new Error('runnerId, labels, owner, and repo are required.');
      let data = await client.addRunnerLabels(owner, repo, runnerId, ctx.input.labels);
      return {
        output: { labels: mapLabels(data) },
        message: `Added labels to runner **${runnerId}**.`
      };
    }

    if (action === 'set_labels') {
      if (!runnerId || !ctx.input.labels || !owner || !repo)
        throw new Error('runnerId, labels, owner, and repo are required.');
      let data = await client.setRunnerLabels(owner, repo, runnerId, ctx.input.labels);
      return {
        output: { labels: mapLabels(data) },
        message: `Set labels on runner **${runnerId}**.`
      };
    }

    if (action === 'remove_label') {
      if (!runnerId || !ctx.input.labelName || !owner || !repo)
        throw new Error('runnerId, labelName, owner, and repo are required.');
      let data = await client.removeRunnerLabel(owner, repo, runnerId, ctx.input.labelName);
      return {
        output: { labels: mapLabels(data) },
        message: `Removed label **${ctx.input.labelName}** from runner **${runnerId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
