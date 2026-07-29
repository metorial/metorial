import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  GitHubIssuesLabelsClient,
  type GitHubLabelResponse
} from '../lib/github-issues-labels';
import { spec } from '../spec';

const labelSchema = z.object({
  labelId: z.number().describe('Label ID'),
  name: z.string().describe('Label name'),
  color: z.string().describe('Label color hex'),
  description: z.string().nullable().describe('Label description')
});

const mapLabel = (label: GitHubLabelResponse) => ({
  labelId: label.id,
  name: label.name,
  color: label.color,
  description: label.description
});

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description:
    'List, create, update, rename, or delete labels in a GitHub repository. Use labels on issues and pull requests for categorization; existing action-based calls remain supported.'
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .optional()
        .describe('Legacy operation selector; list remains available only through action'),
      method: z
        .enum(['create', 'update', 'delete'])
        .optional()
        .describe('Official label write operation'),
      name: z.string().optional().describe('Label name; required for write operations'),
      new_name: z.string().optional().describe('New label name used by the update operation'),
      color: z
        .string()
        .optional()
        .describe(
          'Six-character label color without "#"; required for create and optional for update'
        ),
      description: z.string().optional().describe('Label description for create or update'),
      perPage: z.number().optional().describe('Results per page for list'),
      page: z.number().optional().describe('Page number for list')
    })
  )
  .output(
    z.object({
      labels: z.array(labelSchema).optional().describe('Labels returned by list'),
      label: labelSchema.optional().describe('Created or updated label'),
      deleted: z.boolean().optional().describe('Whether the label was deleted'),
      deletedName: z.string().optional().describe('Deleted label name')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.action !== undefined &&
      ctx.input.method !== undefined &&
      ctx.input.action !== ctx.input.method
    ) {
      throw createApiServiceError('action and method must match when both are provided.', {
        reason: 'github_label_operation_conflict'
      });
    }
    const operation = ctx.input.method ?? ctx.input.action;
    if (!operation) {
      throw createApiServiceError('action or method is required.', {
        reason: 'github_label_operation_required'
      });
    }

    const client = new GitHubIssuesLabelsClient(ctx.auth);
    if (operation === 'list') {
      const labels = await client.listLabels(ctx.input.owner, ctx.input.repo, {
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
      const mapped = labels.map(mapLabel);
      return {
        output: { labels: mapped },
        message: `Found **${mapped.length}** labels in **${ctx.input.owner}/${ctx.input.repo}**.`
      };
    }

    if (!ctx.input.name) {
      throw createApiServiceError('name is required for label write operations.', {
        reason: 'github_label_name_required'
      });
    }

    if (operation === 'create') {
      if (!ctx.input.color) {
        throw createApiServiceError('color is required for create.', {
          reason: 'github_label_color_required'
        });
      }
      const label = await client.createLabel(ctx.input.owner, ctx.input.repo, {
        name: ctx.input.name,
        color: ctx.input.color,
        ...(ctx.input.description !== undefined ? { description: ctx.input.description } : {})
      });
      return {
        output: { label: mapLabel(label) },
        message: `Created label **${label.name}** in **${ctx.input.owner}/${ctx.input.repo}**.`
      };
    }

    if (operation === 'update') {
      if (
        ctx.input.new_name === undefined &&
        ctx.input.color === undefined &&
        ctx.input.description === undefined
      ) {
        throw createApiServiceError(
          'At least one of new_name, color, or description must be provided for update.',
          { reason: 'github_label_update_empty' }
        );
      }
      const label = await client.updateLabel(ctx.input.owner, ctx.input.repo, ctx.input.name, {
        ...(ctx.input.new_name !== undefined ? { new_name: ctx.input.new_name } : {}),
        ...(ctx.input.color !== undefined ? { color: ctx.input.color } : {}),
        ...(ctx.input.description !== undefined ? { description: ctx.input.description } : {})
      });
      return {
        output: { label: mapLabel(label) },
        message: `Updated label **${label.name}** in **${ctx.input.owner}/${ctx.input.repo}**.`
      };
    }

    await client.deleteLabel(ctx.input.owner, ctx.input.repo, ctx.input.name);
    return {
      output: {
        deleted: true,
        deletedName: ctx.input.name
      },
      message: `Deleted label **${ctx.input.name}** from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
