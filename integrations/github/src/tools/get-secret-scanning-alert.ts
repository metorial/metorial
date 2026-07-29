import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let getSecretScanningAlert = SlateTool.create(spec, {
  name: 'Get Secret Scanning Alert',
  key: 'get_secret_scanning_alert',
  description:
    'Get details of a specific secret scanning alert in a GitHub repository, including its secret type, location, state, and resolution information.',
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
      alertNumber: z.number().describe('Secret scanning alert number'),
      alert: z.record(z.string(), z.any()).describe('Secret scanning alert details')
    })
  )
  .handleInvocation(async ctx => {
    let alert = await new GitHubSecurityApi(ctx.auth).getSecretScanningAlert(
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
      message: `Retrieved secret scanning alert **#${ctx.input.alertNumber}** from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
