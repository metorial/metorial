import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let engagementOutputSchema = z.object({
  engagementId: z.string().describe('HubSpot engagement ID'),
  engagementType: z.string().describe('Type of engagement'),
  properties: z.record(z.string(), z.any()).describe('Engagement properties'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let createEngagement = SlateTool.create(spec, {
  name: 'Create Engagement',
  key: 'create_engagement',
  description: `Create a new engagement (note, email, call, meeting, or task) in HubSpot and optionally associate it with CRM records.
Use **notes** for internal comments, **emails** for email tracking, **calls** for call logs, **meetings** for meeting records, and **tasks** for action items.`,
  instructions: [
    'For notes: set hs_note_body and hs_timestamp.',
    'For emails: set hs_email_subject, hs_email_text, hs_email_direction (EMAIL/INCOMING_EMAIL/FORWARDED_EMAIL), hs_timestamp.',
    'For calls: set hs_call_title, hs_call_body, hs_call_duration, hs_call_status, hs_timestamp.',
    'For meetings: set hs_meeting_title, hs_meeting_body, hs_meeting_start_time, hs_meeting_end_time.',
    'For tasks: set hs_task_subject, hs_task_body, hs_task_status (NOT_STARTED/IN_PROGRESS/COMPLETED), hs_task_priority.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createEngagement)
  .input(
    z.object({
      engagementType: z
        .enum(['notes', 'emails', 'calls', 'meetings', 'tasks'])
        .describe('Type of engagement to create'),
      properties: z.record(z.string(), z.any()).describe('Engagement properties'),
      associations: z
        .array(
          z.object({
            to: z.object({
              id: z.string().describe('ID of the CRM object to associate with')
            }),
            types: z.array(
              z.object({
                associationCategory: z
                  .string()
                  .describe('Association category (e.g., HUBSPOT_DEFINED)'),
                associationTypeId: z.number().describe('Association type ID')
              })
            )
          })
        )
        .optional()
        .describe('Associations to CRM records (contacts, companies, deals)')
    })
  )
  .output(engagementOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createEngagement(
      ctx.input.engagementType,
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        engagementId: result.id,
        engagementType: ctx.input.engagementType,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created ${ctx.input.engagementType.slice(0, -1)} engagement (ID: ${result.id})`
    };
  })
  .build();

export let getEngagement = SlateTool.create(spec, {
  name: 'Get Engagement',
  key: 'get_engagement',
  description: `Retrieve an engagement (note, email, call, meeting, or task) from HubSpot by ID and type.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getEngagement)
  .input(
    z.object({
      engagementType: z
        .enum(['notes', 'emails', 'calls', 'meetings', 'tasks'])
        .describe('Type of engagement'),
      engagementId: z.string().describe('HubSpot engagement ID'),
      properties: z.array(z.string()).optional().describe('Specific properties to return')
    })
  )
  .output(engagementOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getEngagement(
      ctx.input.engagementType,
      ctx.input.engagementId,
      ctx.input.properties
    );

    return {
      output: {
        engagementId: result.id,
        engagementType: ctx.input.engagementType,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Retrieved ${ctx.input.engagementType.slice(0, -1)} engagement (ID: ${result.id})`
    };
  })
  .build();

export let updateEngagement = SlateTool.create(spec, {
  name: 'Update Engagement',
  key: 'update_engagement',
  description: `Update an existing engagement's properties in HubSpot.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.updateEngagement)
  .input(
    z.object({
      engagementType: z
        .enum(['notes', 'emails', 'calls', 'meetings', 'tasks'])
        .describe('Type of engagement'),
      engagementId: z.string().describe('HubSpot engagement ID to update'),
      properties: z.record(z.string(), z.any()).describe('Properties to update')
    })
  )
  .output(engagementOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.updateEngagement(
      ctx.input.engagementType,
      ctx.input.engagementId,
      ctx.input.properties
    );

    return {
      output: {
        engagementId: result.id,
        engagementType: ctx.input.engagementType,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Updated ${ctx.input.engagementType.slice(0, -1)} engagement (ID: ${result.id})`
    };
  })
  .build();

export let deleteEngagement = SlateTool.create(spec, {
  name: 'Delete Engagement',
  key: 'delete_engagement',
  description: `Delete an engagement (note, email, call, meeting, or task) from HubSpot.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deleteEngagement)
  .input(
    z.object({
      engagementType: z
        .enum(['notes', 'emails', 'calls', 'meetings', 'tasks'])
        .describe('Type of engagement'),
      engagementId: z.string().describe('HubSpot engagement ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deleteEngagement(ctx.input.engagementType, ctx.input.engagementId);

    return {
      output: { success: true },
      message: `Deleted ${ctx.input.engagementType.slice(0, -1)} engagement (ID: ${ctx.input.engagementId})`
    };
  })
  .build();
