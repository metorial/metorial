import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let assigneeSchema = z
  .object({
    email: z.string().optional().describe('User email address'),
    userId: z.string().optional().describe('User ID'),
    slackUserId: z.string().optional().describe('Slack user ID')
  })
  .describe('Assignee identifier — provide at least one of email, userId, or slackUserId');

export let editIncident = SlateTool.create(spec, {
  name: 'Edit Incident',
  key: 'edit_incident',
  description: `Update an existing incident's properties such as name, summary, severity, status, custom fields, role assignments, and timestamps. Optionally notify the incident channel about the changes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('ID of the incident to edit'),
      notifyIncidentChannel: z
        .boolean()
        .default(true)
        .describe('Whether to send a notification to the incident Slack channel'),
      name: z.string().optional().describe('Updated incident name'),
      summary: z.string().optional().describe('Updated incident summary'),
      callUrl: z
        .string()
        .optional()
        .describe('URL of the active call/meeting for the incident'),
      severityId: z.string().optional().describe('ID of the severity to assign'),
      incidentStatusId: z.string().optional().describe('ID of the incident status to set'),
      customFieldEntries: z
        .array(
          z.object({
            customFieldId: z.string().describe('ID of the custom field'),
            values: z.array(
              z.object({
                valueLiteral: z.string().optional(),
                valueCatalogEntryId: z.string().optional(),
                valueLink: z.string().optional()
              })
            )
          })
        )
        .optional()
        .describe('Custom field values to update'),
      roleAssignments: z
        .array(
          z.object({
            incidentRoleId: z.string().describe('ID of the incident role'),
            assignee: assigneeSchema
          })
        )
        .optional()
        .describe('Updated role assignments'),
      timestampValues: z
        .array(
          z.object({
            incidentTimestampId: z.string().describe('ID of the incident timestamp'),
            value: z.string().describe('ISO 8601 timestamp value')
          })
        )
        .optional()
        .describe('Updated timestamp values')
    })
  )
  .output(
    z.object({
      incidentId: z.string(),
      reference: z.string(),
      name: z.string(),
      severity: z.any().optional(),
      status: z.any().optional(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.editIncident(ctx.input.incidentId, {
      notifyIncidentChannel: ctx.input.notifyIncidentChannel,
      incident: {
        name: ctx.input.name,
        summary: ctx.input.summary,
        callUrl: ctx.input.callUrl,
        severityId: ctx.input.severityId,
        incidentStatusId: ctx.input.incidentStatusId,
        customFieldEntries: ctx.input.customFieldEntries?.map(e => ({
          custom_field_id: e.customFieldId,
          values: e.values.map(v => ({
            value_literal: v.valueLiteral,
            value_catalog_entry_id: v.valueCatalogEntryId,
            value_link: v.valueLink
          }))
        })),
        incidentRoleAssignments: ctx.input.roleAssignments?.map(r => ({
          incident_role_id: r.incidentRoleId,
          assignee: {
            email: r.assignee.email,
            id: r.assignee.userId,
            slack_user_id: r.assignee.slackUserId
          }
        })),
        incidentTimestampValues: ctx.input.timestampValues?.map(t => ({
          incident_timestamp_id: t.incidentTimestampId,
          value: t.value
        }))
      }
    });

    let inc = result.incident;

    return {
      output: {
        incidentId: inc.id,
        reference: inc.reference,
        name: inc.name,
        severity: inc.severity || undefined,
        status: inc.incident_status || undefined,
        updatedAt: inc.updated_at
      },
      message: `Updated incident **${inc.reference}**: ${inc.name}`
    };
  })
  .build();
