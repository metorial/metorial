import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageHoliday = SlateTool.create(spec, {
  name: 'Manage Holiday',
  key: 'manage_holiday',
  description: `Create, update, or delete a public holiday in Hub Planner.
When creating, **name** and **date** are required. Holidays can be set to repeat annually.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      holidayId: z.string().optional().describe('Holiday ID, required for update and delete'),
      name: z.string().optional().describe('Holiday name, required for create'),
      date: z.string().optional().describe('Holiday date (YYYY-MM-DD), required for create'),
      color: z.string().optional().describe('Hex color code'),
      repeat: z.boolean().optional().describe('Whether the holiday recurs annually'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      holidayId: z.string().optional().describe('Holiday ID'),
      name: z.string().optional().describe('Holiday name'),
      date: z.string().optional().describe('Holiday date'),
      color: z.string().optional().describe('Color'),
      repeat: z.boolean().optional().describe('Repeats annually'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, holidayId, ...fields } = ctx.input;

    if (action === 'create') {
      let result = await client.createHoliday(fields);
      return {
        output: {
          holidayId: result._id,
          name: result.name,
          date: result.date,
          color: result.color,
          repeat: result.repeat,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created holiday **${result.name}** on ${result.date} (ID: \`${result._id}\`).`
      };
    }

    if (action === 'update') {
      if (!holidayId) throw new Error('holidayId is required for update');
      let existing = await client.getHoliday(holidayId);
      let result = await client.updateHoliday(holidayId, { ...existing, ...fields });
      return {
        output: {
          holidayId: result._id,
          name: result.name,
          date: result.date,
          color: result.color,
          repeat: result.repeat,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Updated holiday **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (!holidayId) throw new Error('holidayId is required for delete');
    await client.deleteHoliday(holidayId);
    return {
      output: { holidayId },
      message: `Deleted holiday \`${holidayId}\`.`
    };
  })
  .build();
