import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInitiativesTool = SlateTool.create(spec, {
  name: 'List Initiatives',
  key: 'list_initiatives',
  description: `List initiatives in the workspace. Initiatives are larger product efforts that span multiple features and can be linked to objectives.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of initiatives per page')
    })
  )
  .output(
    z.object({
      initiatives: z.array(z.record(z.string(), z.any())).describe('List of initiatives'),
      pageCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listInitiatives({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        initiatives: result.data,
        pageCursor: result.pageCursor
      },
      message: `Retrieved ${result.data.length} initiative(s).`
    };
  })
  .build();

export let getInitiativeTool = SlateTool.create(spec, {
  name: 'Get Initiative',
  key: 'get_initiative',
  description: `Retrieve a single initiative by ID with full details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      initiativeId: z.string().describe('The ID of the initiative to retrieve')
    })
  )
  .output(
    z.object({
      initiative: z.record(z.string(), z.any()).describe('The initiative object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let initiative = await client.getInitiative(ctx.input.initiativeId);

    return {
      output: { initiative },
      message: `Retrieved initiative **${initiative.name || ctx.input.initiativeId}**.`
    };
  })
  .build();

export let createInitiativeTool = SlateTool.create(spec, {
  name: 'Create Initiative',
  key: 'create_initiative',
  description: `Create a new initiative. Initiatives represent larger product efforts that span multiple features and can be linked to objectives.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the initiative'),
      description: z.string().optional().describe('Description of the initiative'),
      state: z.string().optional().describe('State of the initiative'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      initiative: z.record(z.string(), z.any()).describe('The created initiative')
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

    let initiative = await client.createInitiative({
      name: ctx.input.name,
      description: ctx.input.description,
      state: ctx.input.state,
      timeframe
    });

    return {
      output: { initiative },
      message: `Created initiative **${ctx.input.name}**.`
    };
  })
  .build();

export let updateInitiativeTool = SlateTool.create(spec, {
  name: 'Update Initiative',
  key: 'update_initiative',
  description: `Update an existing initiative's name, description, state, or timeframe.`
})
  .input(
    z.object({
      initiativeId: z.string().describe('The ID of the initiative to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      state: z.string().optional().describe('New state'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('New end date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      initiative: z.record(z.string(), z.any()).describe('The updated initiative')
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

    let initiative = await client.updateInitiative(ctx.input.initiativeId, {
      name: ctx.input.name,
      description: ctx.input.description,
      state: ctx.input.state,
      timeframe
    });

    return {
      output: { initiative },
      message: `Updated initiative **${ctx.input.initiativeId}**.`
    };
  })
  .build();

export let deleteInitiativeTool = SlateTool.create(spec, {
  name: 'Delete Initiative',
  key: 'delete_initiative',
  description: `Permanently delete an initiative. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      initiativeId: z.string().describe('The ID of the initiative to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteInitiative(ctx.input.initiativeId);

    return {
      output: { success: true },
      message: `Deleted initiative **${ctx.input.initiativeId}**.`
    };
  })
  .build();
