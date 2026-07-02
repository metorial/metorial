import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createObjective = SlateTool.create(spec, {
  name: 'Create Objective',
  key: 'create_objective',
  description: `Creates a new objective (formerly milestone) in Shortcut. Objectives are top-level strategic goals that connect day-to-day work to broader outcomes. They can be in "to do", "in progress", or "done" states.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the objective (max 256 characters)'),
      description: z.string().optional().describe('Description in Markdown'),
      state: z
        .enum(['to do', 'in progress', 'done'])
        .optional()
        .describe('State of the objective'),
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
      objectiveId: z.number().describe('ID of the created objective'),
      name: z.string().describe('Name of the objective'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      state: z.string().describe('Current state'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.state !== undefined) params.state = ctx.input.state;
    if (ctx.input.categories !== undefined) params.categories = ctx.input.categories;

    let objective = await client.createObjective(params);

    return {
      output: {
        objectiveId: objective.id,
        name: objective.name,
        appUrl: objective.app_url,
        state: objective.state,
        createdAt: objective.created_at
      },
      message: `Created objective **${objective.name}** (ID: ${objective.id}) — [View in Shortcut](${objective.app_url})`
    };
  })
  .build();
