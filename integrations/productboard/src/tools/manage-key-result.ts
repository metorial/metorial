import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listKeyResultsTool = SlateTool.create(spec, {
  name: 'List Key Results',
  key: 'list_key_results',
  description: `List key results, optionally filtered by objective. Key results are measurable outcomes linked to objectives.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectiveId: z.string().optional().describe('Filter by objective ID'),
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of key results per page')
    })
  )
  .output(
    z.object({
      keyResults: z.array(z.record(z.string(), z.any())).describe('List of key results'),
      pageCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listKeyResults({
      objectiveId: ctx.input.objectiveId,
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        keyResults: result.data,
        pageCursor: result.pageCursor
      },
      message: `Retrieved ${result.data.length} key result(s).`
    };
  })
  .build();

export let createKeyResultTool = SlateTool.create(spec, {
  name: 'Create Key Result',
  key: 'create_key_result',
  description: `Create a new key result under an objective. Key results define measurable outcomes for tracking objective progress.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the key result'),
      description: z.string().optional().describe('Description of the key result'),
      objectiveId: z.string().optional().describe('ID of the parent objective'),
      targetValue: z.number().optional().describe('Target value for the key result'),
      currentValue: z.number().optional().describe('Current progress value')
    })
  )
  .output(
    z.object({
      keyResult: z.record(z.string(), z.any()).describe('The created key result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let keyResult = await client.createKeyResult({
      name: ctx.input.name,
      description: ctx.input.description,
      objective: ctx.input.objectiveId ? { id: ctx.input.objectiveId } : undefined,
      targetValue: ctx.input.targetValue,
      currentValue: ctx.input.currentValue
    });

    return {
      output: { keyResult },
      message: `Created key result **${ctx.input.name}**.`
    };
  })
  .build();

export let updateKeyResultTool = SlateTool.create(spec, {
  name: 'Update Key Result',
  key: 'update_key_result',
  description: `Update an existing key result's name, description, or progress values.`
})
  .input(
    z.object({
      keyResultId: z.string().describe('The ID of the key result to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      targetValue: z.number().optional().describe('New target value'),
      currentValue: z.number().optional().describe('New current progress value')
    })
  )
  .output(
    z.object({
      keyResult: z.record(z.string(), z.any()).describe('The updated key result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let keyResult = await client.updateKeyResult(ctx.input.keyResultId, {
      name: ctx.input.name,
      description: ctx.input.description,
      targetValue: ctx.input.targetValue,
      currentValue: ctx.input.currentValue
    });

    return {
      output: { keyResult },
      message: `Updated key result **${ctx.input.keyResultId}**.`
    };
  })
  .build();

export let deleteKeyResultTool = SlateTool.create(spec, {
  name: 'Delete Key Result',
  key: 'delete_key_result',
  description: `Permanently delete a key result. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      keyResultId: z.string().describe('The ID of the key result to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteKeyResult(ctx.input.keyResultId);

    return {
      output: { success: true },
      message: `Deleted key result **${ctx.input.keyResultId}**.`
    };
  })
  .build();
