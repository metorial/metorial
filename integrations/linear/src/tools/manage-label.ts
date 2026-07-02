import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

let labelOutputSchema = z.object({
  labelId: z.string().describe('Label ID'),
  name: z.string().describe('Label name'),
  description: z.string().nullable().describe('Label description'),
  color: z.string().describe('Label color hex code'),
  isGroup: z.boolean().describe('Whether this is a label group'),
  teamId: z.string().nullable().describe('Team ID (null for workspace-level labels)'),
  teamName: z.string().nullable().describe('Team name'),
  parentId: z.string().nullable().describe('Parent label group ID'),
  parentName: z.string().nullable().describe('Parent label group name'),
  createdAt: z.string(),
  updatedAt: z.string()
});

let mapLabelToOutput = (label: any) => ({
  labelId: label.id,
  name: label.name,
  description: label.description || null,
  color: label.color,
  isGroup: label.isGroup ?? false,
  teamId: label.team?.id || null,
  teamName: label.team?.name || null,
  parentId: label.parent?.id || null,
  parentName: label.parent?.name || null,
  createdAt: label.createdAt,
  updatedAt: label.updatedAt
});

export let createLabelTool = SlateTool.create(spec, {
  name: 'Create Label',
  key: 'create_label',
  description: `Creates a new issue label. Labels can be scoped to a team or shared across the workspace.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Label name'),
      color: z.string().optional().describe('Label color as hex code (e.g., #FF0000)'),
      description: z.string().optional().describe('Label description'),
      teamId: z
        .string()
        .optional()
        .describe('Team ID for team-scoped label (omit for workspace-level)')
    })
  )
  .output(labelOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.color) input.color = ctx.input.color;
    if (ctx.input.description) input.description = ctx.input.description;
    if (ctx.input.teamId) input.teamId = ctx.input.teamId;

    let result = await client.createLabel(input);

    if (!result.success) {
      throw linearServiceError('Failed to create label');
    }

    return {
      output: mapLabelToOutput(result.issueLabel),
      message: `Created label **${result.issueLabel.name}**`
    };
  })
  .build();

export let updateLabelTool = SlateTool.create(spec, {
  name: 'Update Label',
  key: 'update_label',
  description: `Updates an existing issue label's name, color, or description.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      labelId: z.string().describe('Label ID'),
      name: z.string().optional().describe('New label name'),
      color: z.string().optional().describe('New color hex code'),
      description: z.string().optional().describe('New description')
    })
  )
  .output(labelOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {};
    if (ctx.input.name !== undefined) input.name = ctx.input.name;
    if (ctx.input.color !== undefined) input.color = ctx.input.color;
    if (ctx.input.description !== undefined) input.description = ctx.input.description;

    let result = await client.updateLabel(ctx.input.labelId, input);

    if (!result.success) {
      throw linearServiceError('Failed to update label');
    }

    return {
      output: mapLabelToOutput(result.issueLabel),
      message: `Updated label **${result.issueLabel.name}**`
    };
  })
  .build();

export let listLabelsTool = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `Lists issue labels, optionally filtered by team. Returns both workspace-level and team-scoped labels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Filter by team ID'),
      first: z.number().optional().describe('Number of labels to return (default: 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      labels: z.array(labelOutputSchema),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.listLabels({
      teamId: ctx.input.teamId,
      first: ctx.input.first,
      after: ctx.input.after
    });

    let labels = (result.nodes || []).map(mapLabelToOutput);

    return {
      output: {
        labels,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${labels.length}** labels`
    };
  })
  .build();
