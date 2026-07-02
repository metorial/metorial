import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkPermission = SlateTool.create(spec, {
  name: 'Check Query Permission',
  key: 'check_query_permission',
  description: `Verify whether the configured API key has permission to query the specified repository. Use this to validate access before sending chat queries.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      allowed: z
        .boolean()
        .describe('Whether queries are allowed for the configured repository'),
      repositoryUrl: z.string().describe('The repository URL that was checked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      repoName: ctx.config.repoName,
      organization: ctx.config.organization
    });

    ctx.progress('Checking query permissions...');

    let result = await client.checkQueryPermission();
    let repoUrl = `https://entelligence.ai/${ctx.config.organization}/${ctx.config.repoName}`;

    return {
      output: {
        allowed: result.allowed,
        repositoryUrl: repoUrl
      },
      message: result.allowed
        ? `Access **granted** for repository **${ctx.config.organization}/${ctx.config.repoName}**.`
        : `Access **denied** for repository **${ctx.config.organization}/${ctx.config.repoName}**. Verify your API key and repository configuration.`
    };
  })
  .build();
