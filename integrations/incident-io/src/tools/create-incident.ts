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

export let createIncident = SlateTool.create(spec, {
  name: 'Create Incident',
  key: 'create_incident',
  description: `Declare a new incident in incident.io. Supports setting visibility, severity, status, type, mode, custom fields, role assignments, and timestamps.`,
  instructions: [
    'An idempotency key is auto-generated if not provided.',
    'Visibility is required — choose "public" or "private".',
    'Standard and test incidents can create chat channels and run notifications or workflows. Retrospective incidents without a supplied channel ID do not create a Slack channel.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      visibility: z
        .enum(['public', 'private'])
        .describe('Whether the incident is visible to all or restricted'),
      name: z.string().optional().describe('Short explanation of the incident'),
      summary: z.string().optional().describe('Detailed description of the incident'),
      severityId: z.string().optional().describe('ID of the severity to assign'),
      incidentStatusId: z.string().optional().describe('ID of the initial incident status'),
      incidentTypeId: z.string().optional().describe('ID of the incident type'),
      mode: z
        .enum(['standard', 'retrospective', 'test', 'tutorial'])
        .optional()
        .describe('Incident mode'),
      retrospectiveIncidentOptions: z
        .object({
          externalId: z
            .number()
            .int()
            .optional()
            .describe('Imported incident reference; requires prior provider enablement'),
          postmortemDocumentUrl: z.string().optional(),
          slackChannelId: z.string().optional()
        })
        .optional()
        .describe(
          'Options for retrospective incidents; omit slackChannelId to avoid creating a Slack channel'
        ),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key for request deduplication; auto-generated if omitted'),
      customFieldEntries: z
        .array(
          z.object({
            customFieldId: z.string().describe('ID of the custom field'),
            values: z.array(
              z.object({
                valueLiteral: z
                  .string()
                  .optional()
                  .describe(
                    'Legacy literal: resolved using the current custom field type; use valueOptionId for select options'
                  ),
                valueText: z.string().optional(),
                valueNumeric: z.string().optional(),
                valueOptionId: z.string().optional(),
                valueTimestamp: z.string().optional(),
                valueCatalogEntryId: z.string().optional(),
                valueLink: z.string().optional()
              })
            )
          })
        )
        .optional()
        .describe('Custom field values to set on the incident'),
      roleAssignments: z
        .array(
          z.object({
            incidentRoleId: z.string().describe('ID of the incident role'),
            assignee: assigneeSchema
          })
        )
        .optional()
        .describe('Role assignments for the incident'),
      timestampValues: z
        .array(
          z.object({
            incidentTimestampId: z.string().describe('ID of the incident timestamp'),
            value: z.string().describe('ISO 8601 timestamp value')
          })
        )
        .optional()
        .describe('Timestamp values for the incident')
    })
  )
  .output(
    z.object({
      incidentId: z.string(),
      reference: z.string(),
      name: z.string(),
      visibility: z.string(),
      mode: z.string(),
      permalink: z.string().optional(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let idempotencyKey = ctx.input.idempotencyKey || crypto.randomUUID();

    let result = await client.createIncident({
      idempotencyKey,
      visibility: ctx.input.visibility,
      name: ctx.input.name,
      summary: ctx.input.summary,
      severityId: ctx.input.severityId,
      incidentStatusId: ctx.input.incidentStatusId,
      incidentTypeId: ctx.input.incidentTypeId,
      mode: ctx.input.mode,
      retrospectiveIncidentOptions: ctx.input.retrospectiveIncidentOptions,
      customFieldEntries: ctx.input.customFieldEntries?.map(e => ({
        custom_field_id: e.customFieldId,
        values: e.values.map(v => ({
          value_literal: v.valueLiteral,
          value_text: v.valueText,
          value_numeric: v.valueNumeric,
          value_option_id: v.valueOptionId,
          value_timestamp: v.valueTimestamp,
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
    });

    let inc = result.incident;

    return {
      output: {
        incidentId: inc.id,
        reference: inc.reference,
        name: inc.name,
        visibility: inc.visibility,
        mode: inc.mode,
        permalink: inc.permalink || undefined,
        createdAt: inc.created_at
      },
      message: `Created incident **${inc.reference}**: ${inc.name}`
    };
  })
  .build();
