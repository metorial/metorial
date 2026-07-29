import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let listCodeScanningAlerts = SlateTool.create(spec, {
  name: 'List Code Scanning Alerts',
  key: 'list_code_scanning_alerts',
  description:
    'List code scanning alerts in a GitHub repository. Filter by alert state, Git ref, severity, or scanning tool to focus security triage.',
  tags: { readOnly: true }
})
  .scopes(anyOf('security_events'))
  .input(
    z.object({
      owner: z.string().describe('The owner of the repository.'),
      repo: z.string().describe('The name of the repository.'),
      state: z
        .enum(['closed', 'dismissed', 'fixed', 'open'])
        .default('open')
        .optional()
        .describe('Filter code scanning alerts by state. Defaults to open'),
      ref: z
        .string()
        .optional()
        .describe('The Git reference for the results you want to list.'),
      severity: z
        .enum(['critical', 'error', 'high', 'low', 'medium', 'note', 'warning'])
        .optional()
        .describe('Filter code scanning alerts by severity'),
      tool_name: z
        .string()
        .optional()
        .describe('The name of the tool used for code scanning.'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page for pagination (min 1, max 100)'),
      page: z.number().min(1).optional().describe('Page number for pagination (min 1)')
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository in owner/name format'),
      alerts: z.array(z.record(z.string(), z.any())).describe('Code scanning alerts'),
      returnedCount: z.number().describe('Number of alerts returned')
    })
  )
  .handleInvocation(async ctx => {
    let alerts = await new GitHubSecurityApi(ctx.auth).listCodeScanningAlerts(
      ctx.input.owner,
      ctx.input.repo,
      {
        state: ctx.input.state,
        ref: ctx.input.ref,
        severity: ctx.input.severity,
        toolName: ctx.input.tool_name,
        perPage: ctx.input.perPage,
        page: ctx.input.page
      }
    );
    return {
      output: {
        repository: `${ctx.input.owner}/${ctx.input.repo}`,
        alerts,
        returnedCount: alerts.length
      },
      message: `Retrieved **${alerts.length}** code scanning alerts from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
