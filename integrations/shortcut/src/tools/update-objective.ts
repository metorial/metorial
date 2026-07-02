import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateObjective = SlateTool.create(spec, {
  name: 'Update Objective',
  key: 'update_objective',
  description: `Updates an existing objective's name, description, state, or categories.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      objectiveId: z.number().describe('ID of the objective to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description in Markdown'),
      state: z.enum(['to do', 'in progress', 'done']).optional().describe('New state'),
      categories: z
        .array(
          z.object({
            name: z.string().describe('Category name')
          })
        )
        .optional()
        .describe('Categories to assign')
    })
  )
  .output(
    z.object({
      objectiveId: z.number().describe('ID of the updated objective'),
      name: z.string().describe('Updated name'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      state: z.string().describe('Updated state'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};

    if (ctx.input.name !== undefined) params.name = ctx.input.name;
    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.state !== undefined) params.state = ctx.input.state;
    if (ctx.input.categories !== undefined) params.categories = ctx.input.categories;

    let objective = await client.updateObjective(ctx.input.objectiveId, params);

    return {
      output: {
        objectiveId: objective.id,
        name: objective.name,
        appUrl: objective.app_url,
        state: objective.state,
        updatedAt: objective.updated_at
      },
      message: `Updated objective **${objective.name}** (ID: ${objective.id}) — [View in Shortcut](${objective.app_url})`
    };
  })
  .build();
