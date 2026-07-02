import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIncident = SlateTool.create(spec, {
  name: 'Get Incident',
  key: 'get_incident',
  description: `Retrieve full details of a single incident by its ID or numeric reference (e.g. "123" for INC-123). Returns complete incident data including severity, status, custom fields, role assignments, timestamps, and duration metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentId: z
        .string()
        .describe('The incident ID (UUID) or numeric reference (e.g. "123" for INC-123)')
    })
  )
  .output(
    z.object({
      incidentId: z.string(),
      reference: z.string(),
      name: z.string(),
      summary: z.string().optional(),
      visibility: z.string(),
      mode: z.string(),
      severity: z.any().optional(),
      status: z.any().optional(),
      incidentType: z.any().optional(),
      creator: z.any().optional(),
      roleAssignments: z.array(z.any()).optional(),
      customFieldEntries: z.array(z.any()).optional(),
      timestampValues: z.array(z.any()).optional(),
      durationMetrics: z.array(z.any()).optional(),
      permalink: z.string().optional(),
      callUrl: z.string().optional(),
      slackChannelId: z.string().optional(),
      slackChannelName: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getIncident(ctx.input.incidentId);
    let inc = result.incident;

    return {
      output: {
        incidentId: inc.id,
        reference: inc.reference,
        name: inc.name,
        summary: inc.summary || undefined,
        visibility: inc.visibility,
        mode: inc.mode,
        severity: inc.severity || undefined,
        status: inc.incident_status || undefined,
        incidentType: inc.incident_type || undefined,
        creator: inc.creator || undefined,
        roleAssignments: inc.incident_role_assignments || undefined,
        customFieldEntries: inc.custom_field_entries || undefined,
        timestampValues: inc.incident_timestamp_values || undefined,
        durationMetrics: inc.duration_metrics || undefined,
        permalink: inc.permalink || undefined,
        callUrl: inc.call_url || undefined,
        slackChannelId: inc.slack_channel_id || undefined,
        slackChannelName: inc.slack_channel_name || undefined,
        createdAt: inc.created_at,
        updatedAt: inc.updated_at
      },
      message: `Retrieved incident **${inc.reference}**: ${inc.name}`
    };
  })
  .build();
