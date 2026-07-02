import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClass = SlateTool.create(spec, {
  name: 'Manage Class',
  key: 'manage_class',
  description: `Create, update, or delete group classes. Classes are associated with a location, staff member, service, date/time, and participant capacity. Use **Search Classes** to find existing classes.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      classId: z.string().optional().describe('Class ID (required for update and delete)'),
      serviceId: z.string().optional().describe('Service ID'),
      staffId: z.string().optional().describe('Staff member ID'),
      locationId: z.string().optional().describe('Location ID'),
      date: z.string().optional().describe('Class date (YYYY-MM-DD)'),
      time: z.string().optional().describe('Class start time (HH:MM AM/PM)'),
      timezone: z.string().optional().describe('Timezone'),
      numberOfParticipants: z.number().optional().describe('Maximum participant capacity'),
      isOnlineClass: z.boolean().optional().describe('Whether this is an online class'),
      onlineClassLink: z.string().optional().describe('Online class URL'),
      onlineClassPassCode: z.string().optional().describe('Online class passcode'),
      notes: z.string().optional().describe('Notes for the class')
    })
  )
  .output(
    z.object({
      classId: z.string().optional().describe('ID of the class'),
      status: z.string().optional().describe('Class status'),
      date: z.string().optional().describe('Class date'),
      time: z.string().optional().describe('Class time'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action, classId, ...fields } = ctx.input;

    if (action === 'create') {
      let result = await client.createClass(fields);
      return {
        output: {
          classId: result.id || result._id,
          status: result.status,
          date: result.date,
          time: result.time,
          success: true
        },
        message: `Created class on **${result.date}** at **${result.time}**.`
      };
    }

    if (action === 'update') {
      if (!classId) throw new Error('classId is required for update');
      let result = await client.updateClass(classId, fields);
      return {
        output: {
          classId: result.id || result._id || classId,
          status: result.status,
          date: result.date,
          time: result.time,
          success: true
        },
        message: `Updated class **${classId}**.`
      };
    }

    if (action === 'delete') {
      if (!classId) throw new Error('classId is required for delete');
      await client.deleteClass(classId);
      return {
        output: {
          classId,
          success: true
        },
        message: `Deleted class **${classId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
