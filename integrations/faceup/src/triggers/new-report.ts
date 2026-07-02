import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newReport = SlateTrigger.create(spec, {
  name: 'New Report',
  key: 'new_report',
  description:
    'Triggers when a new whistleblower report is submitted through any reporting channel. Configure the webhook in FaceUp admin under Integrations > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      reportId: z.string().describe('Unique identifier for the report'),
      tag: z.string().describe('Reference tag/code for the report'),
      origin: z.string().describe('Origin of the report'),
      justification: z.string().describe('Justification classification'),
      priority: z.string().nullable().describe('Priority level'),
      status: z.string().describe('Current status of the report'),
      source: z.string().describe('Reporting channel used'),
      createdAt: z.string().describe('ISO 8601 timestamp of report creation')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Unique identifier for the report'),
      tag: z.string().describe('Reference tag/code for the report'),
      origin: z.string().describe('Origin of the report (e.g., "Member")'),
      justification: z.string().describe('Justification classification'),
      priority: z.string().nullable().describe('Priority level of the report'),
      status: z.string().describe('Current status of the report (e.g., "Open")'),
      source: z.string().describe('Reporting channel used (e.g., "ReportingSystem")'),
      createdAt: z.string().describe('ISO 8601 timestamp of when the report was created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body?.event !== 'ReportCreated') {
        return { inputs: [] };
      }

      let report = body.data?.report ?? {};

      return {
        inputs: [
          {
            eventType: body.event,
            reportId: report.id ?? '',
            tag: report.tag ?? '',
            origin: report.origin ?? '',
            justification: report.justification ?? 'Unknown',
            priority: report.priority ?? null,
            status: report.status ?? '',
            source: report.source ?? '',
            createdAt: report.created_at ?? ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'report.created',
        id: ctx.input.reportId,
        output: {
          reportId: ctx.input.reportId,
          tag: ctx.input.tag,
          origin: ctx.input.origin,
          justification: ctx.input.justification,
          priority: ctx.input.priority,
          status: ctx.input.status,
          source: ctx.input.source,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
