import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let submitterSchema = z.object({
  submitterId: z.number().describe('Submitter ID'),
  email: z.string().optional().describe('Submitter email'),
  name: z.string().nullable().optional().describe('Submitter name'),
  phone: z.string().nullable().optional().describe('Submitter phone'),
  status: z.string().optional().describe('Submitter status'),
  role: z.string().optional().describe('Submitter role'),
  externalId: z.string().nullable().optional().describe('External ID'),
  completedAt: z.string().nullable().optional().describe('Completion timestamp'),
  declinedAt: z.string().nullable().optional().describe('Declined timestamp'),
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
        url: z.string().optional().describe('Document URL')
      })
    )
    .optional()
    .describe('Signed documents')
});

export let submissionEvent = SlateTrigger.create(spec, {
  name: 'Submission Event',
  key: 'submission_event',
  description:
    'Triggered on submission lifecycle events: created, completed (all parties signed), expired, or archived. Configure the webhook URL in the DocuSeal console under Settings > Webhooks.'
})
  .input(
    z.object({
      eventType: z
        .enum([
          'submission.created',
          'submission.completed',
          'submission.expired',
          'submission.archived'
        ])
        .describe('Type of submission event'),
      submissionId: z.number().describe('Submission ID'),
      slug: z.string().optional().describe('Submission slug'),
      status: z.string().optional().describe('Submission status'),
      source: z.string().optional().describe('Submission source'),
      completedAt: z.string().nullable().optional().describe('Completion timestamp'),
      expireAt: z.string().nullable().optional().describe('Expiration timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      archivedAt: z.string().nullable().optional().describe('Archived timestamp'),
      auditLogUrl: z.string().nullable().optional().describe('Audit log URL'),
      combinedDocumentUrl: z.string().nullable().optional().describe('Combined document URL'),
      templateId: z.number().optional().describe('Template ID'),
      templateName: z.string().optional().describe('Template name'),
      submitters: z.array(submitterSchema).optional().describe('Submitters in this submission')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('Submission ID'),
      slug: z.string().optional().describe('Submission slug'),
      status: z.string().optional().describe('Submission status'),
      source: z.string().optional().describe('Submission source'),
      completedAt: z.string().nullable().optional().describe('Completion timestamp'),
      expireAt: z.string().nullable().optional().describe('Expiration timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      archivedAt: z.string().nullable().optional().describe('Archived timestamp'),
      auditLogUrl: z.string().nullable().optional().describe('Audit log URL'),
      combinedDocumentUrl: z.string().nullable().optional().describe('Combined document URL'),
      templateId: z.number().optional().describe('Template ID'),
      templateName: z.string().optional().describe('Template name'),
      submitters: z
        .array(submitterSchema)
        .optional()
        .describe('All submitters and their statuses')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type as string;

      if (!eventType?.startsWith('submission.')) {
        return { inputs: [] };
      }

      let data = body.data || body;

      let submitters = (data.submitters || []).map((s: any) => ({
        submitterId: s.id,
        email: s.email,
        name: s.name,
        phone: s.phone,
        status: s.status,
        role: s.role,
        externalId: s.external_id,
        completedAt: s.completed_at,
        declinedAt: s.declined_at,
        values: s.values || [],
        documents: (s.documents || []).map((d: any) => ({ name: d.name, url: d.url }))
      }));

      let input = {
        eventType: eventType as
          | 'submission.created'
          | 'submission.completed'
          | 'submission.expired'
          | 'submission.archived',
        submissionId: data.id,
        slug: data.slug,
        status: data.status,
        source: data.source,
        completedAt: data.completed_at,
        expireAt: data.expire_at,
        createdAt: data.created_at,
        archivedAt: data.archived_at,
        auditLogUrl: data.audit_log_url,
        combinedDocumentUrl: data.combined_document_url,
        templateId: data.template?.id,
        templateName: data.template?.name,
        submitters
      };

      return { inputs: [input] };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}_${ctx.input.submissionId}_${ctx.input.completedAt || ctx.input.archivedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          submissionId: ctx.input.submissionId,
          slug: ctx.input.slug,
          status: ctx.input.status,
          source: ctx.input.source,
          completedAt: ctx.input.completedAt,
          expireAt: ctx.input.expireAt,
          createdAt: ctx.input.createdAt,
          archivedAt: ctx.input.archivedAt,
          auditLogUrl: ctx.input.auditLogUrl,
          combinedDocumentUrl: ctx.input.combinedDocumentUrl,
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName,
          submitters: ctx.input.submitters
        }
      };
    }
  })
  .build();
