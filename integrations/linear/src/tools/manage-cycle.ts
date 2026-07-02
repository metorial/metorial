import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

let cycleOutputSchema = z.object({
  cycleId: z.string().describe('Cycle ID'),
  name: z.string().nullable().describe('Cycle name'),
  number: z.number().describe('Cycle number within the team'),
  description: z.string().nullable().describe('Cycle description'),
  startsAt: z.string().describe('Cycle start date'),
  endsAt: z.string().describe('Cycle end date'),
  completedAt: z.string().nullable().describe('Completion timestamp'),
  progress: z.number().describe('Cycle progress as decimal (0-1)'),
  url: z.string().nullable().describe('URL to the cycle in Linear when available'),
  teamId: z.string().describe('Team ID'),
  teamName: z.string().describe('Team name'),
  createdAt: z.string(),
  updatedAt: z.string()
});

let mapCycleToOutput = (cycle: any) => ({
  cycleId: cycle.id,
  name: cycle.name || null,
  number: cycle.number ?? 0,
  description: cycle.description || null,
  startsAt: cycle.startsAt,
  endsAt: cycle.endsAt,
  completedAt: cycle.completedAt || null,
  progress: cycle.progress ?? 0,
  url: cycle.url || null,
  teamId: cycle.team?.id || '',
  teamName: cycle.team?.name || '',
  createdAt: cycle.createdAt,
  updatedAt: cycle.updatedAt
});

export let createCycleTool = SlateTool.create(spec, {
  name: 'Create Cycle',
  key: 'create_cycle',
  description: `Creates a new cycle (sprint) for a team in Linear. Cycles are time-boxed iterations that contain a set of issues.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID to create the cycle for'),
      name: z.string().optional().describe('Cycle name'),
      description: z.string().optional().describe('Cycle description'),
      startsAt: z.string().describe('Start date (ISO 8601)'),
      endsAt: z.string().describe('End date (ISO 8601)')
    })
  )
  .output(cycleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {
      teamId: ctx.input.teamId,
      startsAt: ctx.input.startsAt,
      endsAt: ctx.input.endsAt
    };

    if (ctx.input.name) input.name = ctx.input.name;
    if (ctx.input.description) input.description = ctx.input.description;

    let result = await client.createCycle(input);

    if (!result.success) {
      throw linearServiceError('Failed to create cycle');
    }

    return {
      output: mapCycleToOutput(result.cycle),
      message: `Created cycle **${result.cycle.name || `#${result.cycle.number}`}**`
    };
  })
  .build();

export let updateCycleTool = SlateTool.create(spec, {
  name: 'Update Cycle',
  key: 'update_cycle',
  description: `Updates an existing cycle in Linear. Supports changing name, description, and dates.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      cycleId: z.string().describe('Cycle ID'),
      name: z.string().optional().describe('New cycle name'),
      description: z.string().optional().describe('New description'),
      startsAt: z.string().optional().describe('New start date (ISO 8601)'),
      endsAt: z.string().optional().describe('New end date (ISO 8601)')
    })
  )
  .output(cycleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {};
    if (ctx.input.name !== undefined) input.name = ctx.input.name;
    if (ctx.input.description !== undefined) input.description = ctx.input.description;
    if (ctx.input.startsAt !== undefined) input.startsAt = ctx.input.startsAt;
    if (ctx.input.endsAt !== undefined) input.endsAt = ctx.input.endsAt;

    let result = await client.updateCycle(ctx.input.cycleId, input);

    if (!result.success) {
      throw linearServiceError('Failed to update cycle');
    }

    return {
      output: mapCycleToOutput(result.cycle),
      message: `Updated cycle **${result.cycle.name || `#${result.cycle.number}`}**`
    };
  })
  .build();

export let listCyclesTool = SlateTool.create(spec, {
  name: 'List Cycles',
  key: 'list_cycles',
  description: `Lists cycles (sprints) in Linear, optionally filtered by team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Filter by team ID'),
      first: z.number().optional().describe('Number of cycles to return (default: 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      cycles: z.array(cycleOutputSchema),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.listCycles({
      teamId: ctx.input.teamId,
      first: ctx.input.first,
      after: ctx.input.after
    });

    let cycles = (result.nodes || []).map(mapCycleToOutput);

    return {
      output: {
        cycles,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${cycles.length}** cycles`
    };
  })
  .build();
