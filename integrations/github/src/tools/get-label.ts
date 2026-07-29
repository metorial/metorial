import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createGitHubReadClient, githubReadApiError, mapGitHubLabel } from './read-shared';

export let getLabel = SlateTool.create(spec, {
  name: 'Get Label',
  key: 'get_label',
  description: 'Get a specific label from a GitHub repository by name.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (username or organization name)'),
      repo: z.string().describe('Repository name'),
      name: z.string().describe('Label name')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      labelId: z.number().describe('Numeric label ID'),
      nodeId: z.string().describe('GraphQL node ID'),
      name: z.string().describe('Label name'),
      color: z.string().describe('Six-character label color'),
      description: z.string().nullable().describe('Label description'),
      isDefault: z.boolean().describe('Whether this is a default repository label'),
      apiUrl: z.string().describe('GitHub API URL for the label')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGitHubReadClient(ctx.auth);

    try {
      let label = mapGitHubLabel(
        await client.getLabel(ctx.input.owner, ctx.input.repo, ctx.input.name)
      );
      return {
        output: {
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          ...label
        },
        message: `Found label **${label.name}** in **${ctx.input.owner}/${ctx.input.repo}**.`
      };
    } catch (error) {
      throw githubReadApiError(error, 'get label');
    }
  })
  .build();
