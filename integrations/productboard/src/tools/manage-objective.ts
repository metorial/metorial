import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listObjectivesTool = SlateTool.create(spec, {
  name: 'List Objectives',
  key: 'list_objectives',
  description: `List objectives in the workspace. Objectives represent strategic goals that align product work.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of objectives per page')
    })
  )
  .output(
    z.object({
      objectives: z.array(z.record(z.string(), z.any())).describe('List of objectives'),
      pageCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listObjectives({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        objectives: result.data,
        pageCursor: result.pageCursor
      },
      message: `Retrieved ${result.data.length} objective(s).`
    };
  })
  .build();

export let getObjectiveTool = SlateTool.create(spec, {
  name: 'Get Objective',
  key: 'get_objective',
  description: `Retrieve a single objective by ID, including its key results and linked features.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectiveId: z.string().describe('The ID of the objective to retrieve')
    })
  )
  .output(
    z.object({
      objective: z.record(z.string(), z.any()).describe('The objective object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let objective = await client.getObjective(ctx.input.objectiveId);

    return {
      output: { objective },
      message: `Retrieved objective **${objective.name || ctx.input.objectiveId}**.`
    };
  })
  .build();

export let createObjectiveTool = SlateTool.create(spec, {
  name: 'Create Objective',
  key: 'create_objective',
  description: `Create a new objective to define a strategic goal. Objectives can have key results and be linked to features and initiatives.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the objective'),
      description: z.string().optional().describe('Description of the objective'),
      state: z.string().optional().describe('State of the objective (e.g. "active", "done")'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      objective: z.record(z.string(), z.any()).describe('The created objective')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let timeframe: any;
    if (ctx.input.startDate || ctx.input.endDate) {
      timeframe = {};
      if (ctx.input.startDate) timeframe.startDate = ctx.input.startDate;
      if (ctx.input.endDate) timeframe.endDate = ctx.input.endDate;
    }

    let objective = await client.createObjective({
      name: ctx.input.name,
      description: ctx.input.description,
      state: ctx.input.state,
      timeframe
    });

    return {
      output: { objective },
      message: `Created objective **${ctx.input.name}**.`
    };
  })
  .build();

export let updateObjectiveTool = SlateTool.create(spec, {
  name: 'Update Objective',
  key: 'update_objective',
  description: `Update an existing objective's name, description, state, or timeframe.`
})
  .input(
    z.object({
      objectiveId: z.string().describe('The ID of the objective to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      state: z.string().optional().describe('New state (e.g. "active", "done")'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('New end date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      objective: z.record(z.string(), z.any()).describe('The updated objective')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let timeframe: any;
    if (ctx.input.startDate !== undefined || ctx.input.endDate !== undefined) {
      timeframe = {};
      if (ctx.input.startDate !== undefined) timeframe.startDate = ctx.input.startDate;
      if (ctx.input.endDate !== undefined) timeframe.endDate = ctx.input.endDate;
    }

    let objective = await client.updateObjective(ctx.input.objectiveId, {
      name: ctx.input.name,
      description: ctx.input.description,
      state: ctx.input.state,
      timeframe
    });

    return {
      output: { objective },
      message: `Updated objective **${ctx.input.objectiveId}**.`
    };
  })
  .build();

export let deleteObjectiveTool = SlateTool.create(spec, {
  name: 'Delete Objective',
  key: 'delete_objective',
  description: `Permanently delete an objective. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      objectiveId: z.string().describe('The ID of the objective to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteObjective(ctx.input.objectiveId);

    return {
      output: { success: true },
      message: `Deleted objective **${ctx.input.objectiveId}**.`
    };
  })
  .build();
