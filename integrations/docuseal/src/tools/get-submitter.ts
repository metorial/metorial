import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubmitter = SlateTool.create(spec, {
  name: 'Get Submitter',
  key: 'get_submitter',
  description: `Retrieve detailed information about a specific submitter (signer) including their status, filled field values, signed document download URLs, and submission event history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      submitterId: z.number().describe('ID of the submitter to retrieve')
    })
  )
  .output(
    z.object({
      submitterId: z.number().describe('Submitter ID'),
      submissionId: z.number().optional().describe('Submission ID'),
      uuid: z.string().optional().describe('Submitter UUID'),
      slug: z.string().optional().describe('Submitter slug'),
      email: z.string().optional().describe('Submitter email'),
      name: z.string().nullable().optional().describe('Submitter name'),
      phone: z.string().nullable().optional().describe('Submitter phone'),
      status: z.string().optional().describe('Submitter status'),
      role: z.string().optional().describe('Submitter role'),
      externalId: z.string().nullable().optional().describe('External ID'),
      sentAt: z.string().nullable().optional().describe('When the request was sent'),
      openedAt: z.string().nullable().optional().describe('When the form was first opened'),
      completedAt: z.string().nullable().optional().describe('When the form was completed'),
      declinedAt: z.string().nullable().optional().describe('When the form was declined'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
      values: z
        .array(
          z.object({
            field: z.string().describe('Field name'),
            value: z.any().describe('Field value')
          })
        )
        .optional()
        .describe('Filled field values'),
      documents: z
        .array(
          z.object({
            name: z.string().optional().describe('Document name'),
            url: z.string().optional().describe('Signed document download URL')
          })
        )
        .optional()
        .describe('Signed documents'),
      submissionEvents: z
        .array(
          z.object({
            eventId: z.number().optional().describe('Event ID'),
            eventType: z.string().optional().describe('Event type'),
            eventTimestamp: z.string().optional().describe('Event timestamp')
          })
        )
        .optional()
        .describe('Submission events history'),
      template: z
        .object({
          templateId: z.number().optional().describe('Template ID'),
          name: z.string().optional().describe('Template name')
        })
        .optional()
        .describe('Source template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let s = await client.getSubmitter(ctx.input.submitterId);

    return {
      output: {
        submitterId: s.id,
        submissionId: s.submission_id,
        uuid: s.uuid,
        slug: s.slug,
        email: s.email,
        name: s.name,
        phone: s.phone,
        status: s.status,
        role: s.role,
        externalId: s.external_id,
        sentAt: s.sent_at,
        openedAt: s.opened_at,
        completedAt: s.completed_at,
        declinedAt: s.declined_at,
        createdAt: s.created_at,
        metadata: s.metadata,
        values: s.values || [],
        documents: (s.documents || []).map((d: any) => ({
          name: d.name,
          url: d.url
        })),
        submissionEvents: (s.submission_events || []).map((e: any) => ({
          eventId: e.id,
          eventType: e.event_type,
          eventTimestamp: e.event_timestamp
        })),
        template: s.template
          ? {
              templateId: s.template.id,
              name: s.template.name
            }
          : undefined
      },
      message: `Retrieved submitter **${s.email || s.id}** (status: ${s.status || 'unknown'}).`
    };
  })
  .build();
