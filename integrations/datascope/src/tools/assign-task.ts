import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assignTask = SlateTool.create(spec, {
  name: 'Assign Task',
  key: 'assign_task',
  description: `Assign a form to a specific user at a scheduled date and location. The assigned user will receive the task in their mobile app. Location details can be provided inline to create or update the location during assignment.`,
  instructions: [
    'Date format should be YYYY-MM-DD HH:MM.',
    'The user is identified by their email address.',
    'Location code references an existing location, or a new one is created if location details are provided.',
    'Gap specifies hours allowed to complete the task from the scheduled time.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to assign'),
      userEmail: z.string().describe('Email of the user to assign the task to'),
      date: z.string().describe('Scheduled date and time (YYYY-MM-DD HH:MM)'),
      locationCode: z.string().optional().describe('Code of the location for the task'),
      locationName: z
        .string()
        .optional()
        .describe('Location name (creates/updates location if provided)'),
      locationAddress: z.string().optional().describe('Location address'),
      locationPhone: z.string().optional().describe('Location phone number'),
      locationEmail: z.string().optional().describe('Location email'),
      companyName: z.string().optional().describe('Company name associated with the location'),
      companyCode: z.string().optional().describe('Company code associated with the location'),
      latitude: z.number().optional().describe('GPS latitude of the task location'),
      longitude: z.number().optional().describe('GPS longitude of the task location'),
      taskInstruction: z.string().optional().describe('Instructions or notes for the user'),
      gap: z.number().optional().describe('Time window in hours to complete the task'),
      taskCode: z.string().optional().describe('Custom task identifier code')
    })
  )
  .output(
    z.object({
      task: z.any().describe('Task assignment response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.assignTask({
      formId: ctx.input.formId,
      userEmail: ctx.input.userEmail,
      date: ctx.input.date,
      locationCode: ctx.input.locationCode,
      locationName: ctx.input.locationName,
      locationAddress: ctx.input.locationAddress,
      locationPhone: ctx.input.locationPhone,
      locationEmail: ctx.input.locationEmail,
      companyName: ctx.input.companyName,
      companyCode: ctx.input.companyCode,
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      taskInstruction: ctx.input.taskInstruction,
      gap: ctx.input.gap,
      code: ctx.input.taskCode
    });

    return {
      output: {
        task: result
      },
      message: `Assigned form **${ctx.input.formId}** to **${ctx.input.userEmail}** scheduled for **${ctx.input.date}**.`
    };
  })
  .build();
