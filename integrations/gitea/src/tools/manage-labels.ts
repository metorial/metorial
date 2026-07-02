import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let labelOutputSchema = z.object({
  labelId: z.number().describe('Label ID'),
  name: z.string().describe('Label name'),
  color: z.string().describe('Label hex color code'),
  description: z.string().describe('Label description')
});

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `List all labels available in a repository. Useful for finding label IDs needed when creating or updating issues and pull requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      labels: z.array(labelOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let labels = await client.listRepoLabels(ctx.input.owner, ctx.input.repo, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        labels: labels.map(l => ({
          labelId: l.id,
          name: l.name,
          color: l.color,
          description: l.description || ''
        }))
      },
      message: `Found **${labels.length}** labels in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let createLabel = SlateTool.create(spec, {
  name: 'Create Label',
  key: 'create_label',
  description: `Create a new label in a repository. Labels can be assigned to issues and pull requests for categorization.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      name: z.string().describe('Label name'),
      color: z.string().describe('Hex color code (e.g., "#00aabb" or "00aabb")'),
      description: z.string().optional().describe('Label description')
    })
  )
  .output(labelOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let l = await client.createLabel(ctx.input.owner, ctx.input.repo, {
      name: ctx.input.name,
      color: ctx.input.color,
      description: ctx.input.description
    });

    return {
      output: {
        labelId: l.id,
        name: l.name,
        color: l.color,
        description: l.description || ''
      },
      message: `Created label **${l.name}** in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();
