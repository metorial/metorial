import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageVacation = SlateTool.create(spec, {
  name: 'Manage Vacation',
  key: 'manage_vacation',
  description: `Create, update, or delete vacation/time-off records for resources in Hub Planner.
When creating, **resourceId**, **start**, **end**, and **type** are required.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      vacationId: z
        .string()
        .optional()
        .describe('Vacation ID, required for update and delete'),
      resourceId: z.string().optional().describe('Resource ID, required for create'),
      start: z.string().optional().describe('Start date (YYYY-MM-DD), required for create'),
      end: z.string().optional().describe('End date (YYYY-MM-DD), required for create'),
      type: z.string().optional().describe('Vacation type, required for create'),
      title: z.string().optional().describe('Vacation title'),
      percentAllocation: z.number().optional().describe('Percent allocation'),
      minutesPerDay: z.number().optional().describe('Minutes per day')
    })
  )
  .output(
    z.object({
      vacationId: z.string().optional().describe('Vacation ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      start: z.string().optional().describe('Start date'),
      end: z.string().optional().describe('End date'),
      type: z.string().optional().describe('Vacation type'),
      title: z.string().optional().describe('Vacation title'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, vacationId, resourceId, ...fields } = ctx.input;

    if (action === 'create') {
      let body: Record<string, any> = { ...fields, resource: resourceId };
      let result = await client.createVacation(body);
      return {
        output: {
          vacationId: result._id,
          resourceId: result.resource,
          start: result.start,
          end: result.end,
          type: result.type,
          title: result.title,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created vacation (ID: \`${result._id}\`) for resource \`${result.resource}\`.`
      };
    }

    if (action === 'update') {
      if (!vacationId) throw new Error('vacationId is required for update');
      let body: Record<string, any> = { ...fields };
      if (resourceId) body.resource = resourceId;
      let result = await client.updateVacation(vacationId, body);
      return {
        output: {
          vacationId: result._id,
          resourceId: result.resource,
          start: result.start,
          end: result.end,
          type: result.type,
          title: result.title,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Updated vacation \`${result._id}\`.`
      };
    }

    if (!vacationId) throw new Error('vacationId is required for delete');
    await client.deleteVacation(vacationId);
    return {
      output: { vacationId },
      message: `Deleted vacation \`${vacationId}\`.`
    };
  })
  .build();
