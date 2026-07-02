import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let documentSchema = z.object({
  name: z.string().optional().describe('Document name'),
  url: z.string().optional().describe('Document download URL')
});

let valueSchema = z.object({
  field: z.string().describe('Field name'),
  value: z.any().describe('Field value')
});

export let formEvent = SlateTrigger.create(spec, {
  name: 'Form Event',
  key: 'form_event',
  description:
    'Triggered when a submitter interacts with a signing form: viewed, started filling, completed signing, or declined. Configure the webhook URL in the DocuSeal console under Settings > Webhooks.'
})
  .input(
    z.object({
      eventType: z
        .enum(['form.viewed', 'form.started', 'form.completed', 'form.declined'])
        .describe('Type of form event'),
      submitterId: z.number().describe('Submitter ID'),
      submissionId: z.number().optional().describe('Submission ID'),
      email: z.string().optional().describe('Submitter email'),
      name: z.string().nullable().optional().describe('Submitter name'),
      phone: z.string().nullable().optional().describe('Submitter phone'),
      role: z.string().optional().describe('Submitter role'),
      status: z.string().optional().describe('Submitter status'),
      externalId: z.string().nullable().optional().describe('External ID'),
      sentAt: z.string().nullable().optional().describe('When request was sent'),
      openedAt: z.string().nullable().optional().describe('When form was opened'),
      completedAt: z.string().nullable().optional().describe('When form was completed'),
      declinedAt: z.string().nullable().optional().describe('When form was declined'),
      declineReason: z.string().nullable().optional().describe('Decline reason'),
      metadata: z.record(z.string(), z.any()).optional().describe('Submitter metadata'),
      values: z.array(valueSchema).optional().describe('Filled field values'),
      documents: z.array(documentSchema).optional().describe('Signed documents'),
      auditLogUrl: z.string().nullable().optional().describe('Audit log URL'),
      templateId: z.number().optional().describe('Template ID'),
      templateName: z.string().optional().describe('Template name'),
      ip: z.string().optional().describe('Submitter IP address'),
      ua: z.string().optional().describe('Submitter user agent')
    })
  )
  .output(
    z.object({
      submitterId: z.number().describe('Submitter ID'),
      submissionId: z.number().optional().describe('Submission ID'),
      email: z.string().optional().describe('Submitter email'),
      name: z.string().nullable().optional().describe('Submitter name'),
      phone: z.string().nullable().optional().describe('Submitter phone'),
      role: z.string().optional().describe('Submitter role'),
      status: z.string().optional().describe('Submitter status'),
      externalId: z.string().nullable().optional().describe('External ID'),
      sentAt: z.string().nullable().optional().describe('When request was sent'),
      openedAt: z.string().nullable().optional().describe('When form was opened'),
      completedAt: z.string().nullable().optional().describe('When form was completed'),
      declinedAt: z.string().nullable().optional().describe('When form was declined'),
      declineReason: z
        .string()
        .nullable()
        .optional()
        .describe('Decline reason (for declined events)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Submitter metadata'),
      values: z.array(valueSchema).optional().describe('Filled field values'),
      documents: z.array(documentSchema).optional().describe('Signed document URLs'),
      auditLogUrl: z.string().nullable().optional().describe('Audit log URL'),
      templateId: z.number().optional().describe('Template ID'),
      templateName: z.string().optional().describe('Template name'),
      ip: z.string().optional().describe('Submitter IP address'),
      ua: z.string().optional().describe('Submitter user agent')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type as string;

      if (!eventType?.startsWith('form.')) {
        return { inputs: [] };
      }

      let data = body.data || body;

      let input = {
        eventType: eventType as
          | 'form.viewed'
          | 'form.started'
          | 'form.completed'
          | 'form.declined',
        submitterId: data.id,
        submissionId: data.submission_id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        externalId: data.external_id,
        sentAt: data.sent_at,
        openedAt: data.opened_at,
        completedAt: data.completed_at,
        declinedAt: data.declined_at,
        declineReason: data.decline_reason,
        metadata: data.metadata,
        values: data.values || [],
        documents: (data.documents || []).map((d: any) => ({ name: d.name, url: d.url })),
        auditLogUrl: data.audit_log_url,
        templateId: data.template?.id,
        templateName: data.template?.name,
        ip: data.ip,
        ua: data.ua
      };

      return { inputs: [input] };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}_${ctx.input.submitterId}_${ctx.input.completedAt || ctx.input.openedAt || ctx.input.sentAt || Date.now()}`,
        output: {
          submitterId: ctx.input.submitterId,
          submissionId: ctx.input.submissionId,
          email: ctx.input.email,
          name: ctx.input.name,
          phone: ctx.input.phone,
          role: ctx.input.role,
          status: ctx.input.status,
          externalId: ctx.input.externalId,
          sentAt: ctx.input.sentAt,
          openedAt: ctx.input.openedAt,
          completedAt: ctx.input.completedAt,
          declinedAt: ctx.input.declinedAt,
          declineReason: ctx.input.declineReason,
          metadata: ctx.input.metadata,
          values: ctx.input.values,
          documents: ctx.input.documents,
          auditLogUrl: ctx.input.auditLogUrl,
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName,
          ip: ctx.input.ip,
          ua: ctx.input.ua
        }
      };
    }
  })
  .build();
