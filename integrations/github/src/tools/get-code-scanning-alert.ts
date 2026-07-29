import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let getCodeScanningAlert = SlateTool.create(spec, {
  name: 'Get Code Scanning Alert',
  key: 'get_code_scanning_alert',
  description:
    'Get details of a specific code scanning alert in a GitHub repository, including its rule, state, severity, affected location, and dismissal information.',
  tags: { readOnly: true }
})
  .scopes(anyOf('security_events'))
  .input(
    z.object({
      owner: z.string().describe('The owner of the repository.'),
      repo: z.string().describe('The name of the repository.'),
      alertNumber: z.number().describe('The number of the alert.')
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository in owner/name format'),
      alertNumber: z.number().describe('Code scanning alert number'),
      alert: z.record(z.string(), z.any()).describe('Code scanning alert details')
    })
  )
  .handleInvocation(async ctx => {
    let alert = await new GitHubSecurityApi(ctx.auth).getCodeScanningAlert(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.alertNumber
    );
    return {
      output: {
        repository: `${ctx.input.owner}/${ctx.input.repo}`,
        alertNumber: ctx.input.alertNumber,
        alert
      },
      message: `Retrieved code scanning alert **#${ctx.input.alertNumber}** from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
