import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let listRepositories = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `List GitHub repositories accessible to your Cursor account. These repositories can be used as sources when launching cloud agents.`,
  constraints: [
    'Rate limited to 1 request per user per minute and 30 per hour.',
    'May take tens of seconds to complete.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      repositories: z.array(
        z.object({
          owner: z.string().describe('Repository owner (org or user)'),
          name: z.string().describe('Repository name'),
          repositoryUrl: z.string().describe('Full GitHub URL of the repository')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.listRepositories();

    return {
      output: {
        repositories: result.repositories.map(r => ({
          owner: r.owner,
          name: r.name,
          repositoryUrl: r.repository
        }))
      },
      message: `Found **${result.repositories.length}** accessible repositories.`
    };
  })
  .build();
