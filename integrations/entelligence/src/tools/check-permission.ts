import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkPermission = SlateTool.create(spec, {
  name: 'Check Query Permission',
  key: 'check_query_permission',
  description:
    'Check whether the configured Entelligence chat-widget repository allows questions to its owners. This is the widget’s owner-submission permission check; it does not prove access to every Entelligence feature.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      allowed: z
        .boolean()
        .describe('Whether owner submissions are allowed for the configured repository'),
      repositoryUrl: z
        .string()
        .describe(
          'Configured repository address; the provider does not return a verified navigation link'
        )
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
    let repoUrl = `https://entelligence.ai/${encodeURIComponent(ctx.config.organization)}/${encodeURIComponent(ctx.config.repoName)}`;

    return {
      output: {
        allowed: result.allowed,
        repositoryUrl: repoUrl
      },
      message: result.allowed
        ? `Owner submissions are allowed for **${ctx.config.organization}/${ctx.config.repoName}**.`
        : `Owner submissions are not allowed for **${ctx.config.organization}/${ctx.config.repoName}**. Verify your API key, repository configuration, and owner Slack setup.`
    };
  })
  .build();
