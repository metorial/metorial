import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `List existing labels or create a new label in a GitHub repository. Labels can be applied to issues and pull requests for categorization.`
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      action: z.enum(['list', 'create']).describe('Action to perform'),
      name: z.string().optional().describe('Label name (required for create)'),
      color: z
        .string()
        .optional()
        .describe('Label color hex code without "#" (e.g., "ff0000")'),
      description: z.string().optional().describe('Label description'),
      perPage: z.number().optional().describe('Results per page for list'),
      page: z.number().optional().describe('Page number for list')
    })
  )
  .output(
    z.object({
      labels: z
        .array(
          z.object({
            labelId: z.number().describe('Label ID'),
            name: z.string().describe('Label name'),
            color: z.string().describe('Label color hex'),
            description: z.string().nullable().describe('Label description')
          })
        )
        .optional()
        .describe('List of labels (for list action)'),
      label: z
        .object({
          labelId: z.number().describe('Label ID'),
          name: z.string().describe('Label name'),
          color: z.string().describe('Label color hex'),
          description: z.string().nullable().describe('Label description')
        })
        .optional()
        .describe('Created label (for create action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, action } = ctx.input;

    if (action === 'list') {
      let labels = await client.listLabels(owner, repo, {
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
      let mapped = labels.map((l: any) => ({
        labelId: l.id,
        name: l.name,
        color: l.color,
        description: l.description
      }));
      return {
        output: { labels: mapped },
        message: `Found **${mapped.length}** labels in **${owner}/${repo}**.`
      };
    }

    if (!ctx.input.name) {
      throw new Error('name is required for create action.');
    }

    let label = await client.createLabel(owner, repo, {
      name: ctx.input.name,
      color: ctx.input.color,
      description: ctx.input.description
    });

    return {
      output: {
        label: {
          labelId: label.id,
          name: label.name,
          color: label.color,
          description: label.description
        }
      },
      message: `Created label **${label.name}** in **${owner}/${repo}**.`
    };
  })
  .build();
