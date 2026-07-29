import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let listSecretScanningAlerts = SlateTool.create(spec, {
  name: 'List Secret Scanning Alerts',
  key: 'list_secret_scanning_alerts',
  description:
    'List secret scanning alerts in a GitHub repository. Filter by state, resolution, or secret type to investigate exposed credentials and remediation status.',
  tags: { readOnly: true }
})
  .scopes(anyOf('security_events'))
  .input(
    z.object({
      owner: z.string().describe('The owner of the repository.'),
      repo: z.string().describe('The name of the repository.'),
      state: z.enum(['open', 'resolved']).optional().describe('Filter by state'),
      secret_type: z
        .string()
        .optional()
        .describe(
          'A comma-separated list of secret types to return. All default secret patterns are returned. To return generic patterns, pass the token name(s) in the parameter.'
        ),
      resolution: z
        .enum([
          'false_positive',
          'pattern_deleted',
          'pattern_edited',
          'revoked',
          'used_in_tests',
          'wont_fix'
        ])
        .optional()
        .describe('Filter by resolution'),
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
      alerts: z.array(z.record(z.string(), z.any())).describe('Secret scanning alerts'),
      returnedCount: z.number().describe('Number of alerts returned')
    })
  )
  .handleInvocation(async ctx => {
    let alerts = await new GitHubSecurityApi(ctx.auth).listSecretScanningAlerts(
      ctx.input.owner,
      ctx.input.repo,
      {
        state: ctx.input.state,
        secretType: ctx.input.secret_type,
        resolution: ctx.input.resolution,
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
      message: `Retrieved **${alerts.length}** secret scanning alerts from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
