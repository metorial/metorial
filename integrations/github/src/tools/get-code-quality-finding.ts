import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let getCodeQualityFinding = SlateTool.create(spec, {
  name: 'Get Code Quality Finding',
  key: 'get_code_quality_finding',
  description:
    'Get details of a specific code quality finding in a GitHub repository, including its diagnostic context and remediation suggestion when available.',
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('The owner of the repository.'),
      repo: z.string().describe('The name of the repository.'),
      findingNumber: z.number().describe('The number of the finding.')
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository in owner/name format'),
      findingNumber: z.number().describe('Code quality finding number'),
      finding: z.record(z.string(), z.any()).describe('Code quality finding details')
    })
  )
  .handleInvocation(async ctx => {
    let finding = await new GitHubSecurityApi(ctx.auth).getCodeQualityFinding(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.findingNumber
    );
    return {
      output: {
        repository: `${ctx.input.owner}/${ctx.input.repo}`,
        findingNumber: ctx.input.findingNumber,
        finding
      },
      message: `Retrieved code quality finding **#${ctx.input.findingNumber}** from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
