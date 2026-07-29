import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let listDependabotAlerts = SlateTool.create(spec, {
  name: 'List Dependabot Alerts',
  key: 'list_dependabot_alerts',
  description:
    'List Dependabot alerts in a GitHub repository. Filter by lifecycle state or severity and use the returned cursor to continue through larger security backlogs.',
  tags: { readOnly: true }
})
  .scopes(anyOf('security_events'))
  .input(
    z.object({
      owner: z.string().describe('The owner of the repository.'),
      repo: z.string().describe('The name of the repository.'),
      state: z
        .enum(['auto_dismissed', 'dismissed', 'fixed', 'open'])
        .default('open')
        .optional()
        .describe('Filter dependabot alerts by state. Defaults to open'),
      severity: z
        .enum(['critical', 'high', 'low', 'medium'])
        .optional()
        .describe('Filter dependabot alerts by severity'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page for pagination (min 1, max 100)'),
      after: z
        .string()
        .optional()
        .describe('Cursor for pagination. Use the cursor from the previous response.')
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository in owner/name format'),
      alerts: z.array(z.record(z.string(), z.any())).describe('Dependabot alerts'),
      returnedCount: z.number().describe('Number of alerts returned'),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        nextCursor: z.string().optional(),
        prevCursor: z.string().optional()
      })
    })
  )
  .handleInvocation(async ctx => {
    let result = await new GitHubSecurityApi(ctx.auth).listDependabotAlerts(
      ctx.input.owner,
      ctx.input.repo,
      {
        state: ctx.input.state,
        severity: ctx.input.severity,
        perPage: ctx.input.perPage,
        after: ctx.input.after
      }
    );
    return {
      output: {
        repository: `${ctx.input.owner}/${ctx.input.repo}`,
        alerts: result.alerts,
        returnedCount: result.alerts.length,
        pageInfo: result.pageInfo
      },
      message: `Retrieved **${result.alerts.length}** Dependabot alerts from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
