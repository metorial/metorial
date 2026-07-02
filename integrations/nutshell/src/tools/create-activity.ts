import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let createActivity = SlateTool.create(spec, {
  name: 'Create Activity',
  key: 'create_activity',
  description: `Log a new activity (call, meeting, email, etc.) in Nutshell CRM. Activities can be associated with leads and participants to track interactions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name or subject of the activity'),
      activityTypeId: z
        .number()
        .optional()
        .describe('Activity type ID (use Find Activity Types to discover available types)'),
      leadId: z.number().optional().describe('ID of the lead to associate with this activity'),
      contactIds: z
        .array(z.number())
        .optional()
        .describe('IDs of contacts participating in this activity'),
      startTime: z
        .string()
        .optional()
        .describe('Start time for the activity (ISO 8601 format)'),
      endTime: z.string().optional().describe('End time for the activity (ISO 8601 format)'),
      note: z.string().optional().describe('Note or description for the activity'),
      status: z
        .number()
        .optional()
        .describe('Activity status (0=scheduled, 1=logged, 2=canceled)')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('ID of the created activity'),
      rev: z.string().describe('Revision identifier'),
      name: z.string().describe('Name of the activity'),
      entityType: z.string().describe('Entity type (Activities)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let activityData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.activityTypeId) activityData.activityTypeId = ctx.input.activityTypeId;
    if (ctx.input.leadId) activityData.lead = { entityType: 'Leads', id: ctx.input.leadId };
    if (ctx.input.contactIds) {
      activityData.participants = ctx.input.contactIds.map(id => ({
        entityType: 'Contacts',
        id
      }));
    }
    if (ctx.input.startTime) activityData.startTime = ctx.input.startTime;
    if (ctx.input.endTime) activityData.endTime = ctx.input.endTime;
    if (ctx.input.note) activityData.note = ctx.input.note;
    if (ctx.input.status !== undefined) activityData.status = ctx.input.status;

    let result = await client.newActivity(activityData);

    return {
      output: {
        activityId: result.id,
        rev: String(result.rev),
        name: result.name,
        entityType: result.entityType
      },
      message: `Created activity **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
