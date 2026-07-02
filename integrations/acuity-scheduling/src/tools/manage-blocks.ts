import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let blockSchema = z.object({
  blockId: z.number().describe('Block ID'),
  start: z.string().describe('Block start date and time'),
  end: z.string().describe('Block end date and time'),
  calendarId: z.number().describe('Calendar ID'),
  notes: z.string().optional().describe('Block notes'),
  description: z.string().optional().describe('Human-readable description')
});

export let createBlock = SlateTool.create(spec, {
  name: 'Create Time Block',
  key: 'create_block',
  description: `Block off a time range on a specific calendar to prevent appointment scheduling during that period.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      start: z.string().describe('Block start date and time (e.g. "2024-03-15 09:00")'),
      end: z.string().describe('Block end date and time (e.g. "2024-03-15 12:00")'),
      calendarId: z.number().describe('Calendar ID to add the block to'),
      notes: z.string().optional().describe('Notes for the blocked time')
    })
  )
  .output(blockSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let b = await client.createBlock({
      start: ctx.input.start,
      end: ctx.input.end,
      calendarID: ctx.input.calendarId,
      notes: ctx.input.notes
    });

    return {
      output: {
        blockId: b.id,
        start: b.start || ctx.input.start,
        end: b.end || ctx.input.end,
        calendarId: b.calendarID || ctx.input.calendarId,
        notes: b.notes || undefined,
        description: b.description || undefined
      },
      message: `Time block **#${b.id}** created from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();

export let listBlocks = SlateTool.create(spec, {
  name: 'List Time Blocks',
  key: 'list_blocks',
  description: `Retrieve a list of time blocks. Optionally filter by date range or calendar.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      minDate: z.string().optional().describe('Only return blocks on or after this date'),
      maxDate: z.string().optional().describe('Only return blocks on or before this date'),
      calendarId: z.number().optional().describe('Filter by calendar ID')
    })
  )
  .output(
    z.object({
      blocks: z.array(blockSchema).describe('List of time blocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listBlocks({
      minDate: ctx.input.minDate,
      maxDate: ctx.input.maxDate,
      calendarID: ctx.input.calendarId
    });

    let blocks = (results as any[]).map((b: any) => ({
      blockId: b.id,
      start: b.start || '',
      end: b.end || '',
      calendarId: b.calendarID,
      notes: b.notes || undefined,
      description: b.description || undefined
    }));

    return {
      output: { blocks },
      message: `Found **${blocks.length}** time block(s).`
    };
  })
  .build();

export let deleteBlock = SlateTool.create(spec, {
  name: 'Delete Time Block',
  key: 'delete_block',
  description: `Remove a time block to re-open that time slot for scheduling.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      blockId: z.number().describe('The ID of the block to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the block was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    await client.deleteBlock(ctx.input.blockId);

    return {
      output: { success: true },
      message: `Time block **#${ctx.input.blockId}** deleted.`
    };
  })
  .build();
