import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

export let createJob = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Creates a new job (project/booking) in Tave with associated details. Jobs link contacts to work engagements like weddings, portrait sessions, or other photography services. Can include job type, stage, event details, and role assignments. Requires the **API Key (Public API V2)** authentication method.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      jobType: z.string().describe('Type of job (e.g., "Wedding", "Portrait", "Engagement")'),
      brand: z.string().optional().describe('Brand to associate the job with'),
      jobStage: z.string().optional().describe('Initial stage of the job'),
      contactId: z.string().optional().describe('ID of the primary contact for this job'),
      jobRole: z
        .string()
        .optional()
        .describe('Role of the primary contact (e.g., "Bride", "Groom", "Client")'),
      eventType: z.string().optional().describe('Type of event'),
      eventDate: z.string().optional().describe('Date of the event (e.g., "2026-06-15")'),
      eventTime: z.string().optional().describe('Time of the event (e.g., "14:00")'),
      eventEndDate: z.string().optional().describe('End date of the event'),
      eventEndTime: z.string().optional().describe('End time of the event'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the event (e.g., "America/New_York")'),
      source: z.string().optional().describe('How the client found you'),
      notes: z.string().optional().describe('Notes about the job'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom job fields as key-value pairs')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the created job'),
      jobType: z.string().describe('Type of the created job'),
      raw: z.any().optional().describe('Full job record from API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth.token);

    let data: Record<string, unknown> = {
      job_type: ctx.input.jobType
    };

    if (ctx.input.brand) data.brand = ctx.input.brand;
    if (ctx.input.jobStage) data.job_stage = ctx.input.jobStage;
    if (ctx.input.contactId) data.contact_id = ctx.input.contactId;
    if (ctx.input.jobRole) data.job_role = ctx.input.jobRole;
    if (ctx.input.eventType) data.event_type = ctx.input.eventType;
    if (ctx.input.eventDate) data.event_date = ctx.input.eventDate;
    if (ctx.input.eventTime) data.event_time = ctx.input.eventTime;
    if (ctx.input.eventEndDate) data.event_end_date = ctx.input.eventEndDate;
    if (ctx.input.eventEndTime) data.event_end_time = ctx.input.eventEndTime;
    if (ctx.input.timezone) data.timezone = ctx.input.timezone;
    if (ctx.input.source) data.source = ctx.input.source;
    if (ctx.input.notes) data.notes = ctx.input.notes;

    if (ctx.input.customFields) {
      data.custom_fields = ctx.input.customFields;
    }

    ctx.info({ message: 'Creating job in Tave', jobType: ctx.input.jobType });

    let result = await client.createJob(data);

    return {
      output: {
        jobId: String(result.id ?? result.job_id ?? ''),
        jobType: result.job_type ?? ctx.input.jobType,
        raw: result
      },
      message: `Successfully created **${ctx.input.jobType}** job${ctx.input.eventDate ? ` for ${ctx.input.eventDate}` : ''}.`
    };
  })
  .build();
