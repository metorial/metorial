import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let getDependabotAlert = SlateTool.create(spec, {
  name: 'Get Dependabot Alert',
  key: 'get_dependabot_alert',
  description:
    'Get details of a specific Dependabot alert in a GitHub repository, including the vulnerable dependency, advisory, severity, and remediation information.',
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
      alertNumber: z.number().describe('Dependabot alert number'),
      alert: z.record(z.string(), z.any()).describe('Dependabot alert details')
    })
  )
  .handleInvocation(async ctx => {
    let alert = await new GitHubSecurityApi(ctx.auth).getDependabotAlert(
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
      message: `Retrieved Dependabot alert **#${ctx.input.alertNumber}** from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
