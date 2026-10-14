import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient, textField } from '../lib/client';
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
      jobType: z
        .string()
        .describe('Exact job type name or ID. Call get_job_types to discover job types'),
      brand: z
        .string()
        .optional()
        .describe('Exact brand name or ID. Call get_brands to discover brands'),
      jobStage: z
        .string()
        .optional()
        .describe('Initial stage: lead, booked, fulfillment, or completed'),
      contactId: z.string().optional().describe('ID of the primary contact for this job'),
      jobRole: z
        .string()
        .optional()
        .describe(
          'Exact configured role name or ID for the primary contact; requires contactId'
        ),
      eventType: z.string().optional().describe('Exact configured event type name or ID'),
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
        .describe('Custom job fields keyed by the configured field ID, exact name, or token')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the created job'),
      jobType: z.string().describe('Type of the created job'),
      jobContactId: z
        .string()
        .optional()
        .describe('ID of the link to the primary contact, when requested'),
      eventId: z.string().optional().describe('ID of the scheduled event, when requested'),
      raw: z.any().optional().describe('Full job record from API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth);
    if (
      ctx.input.jobStage &&
      !['lead', 'booked', 'fulfillment', 'completed'].includes(ctx.input.jobStage)
    ) {
      throw createApiServiceError(
        'Job stage must be lead, booked, fulfillment, or completed.'
      );
    }
    if (ctx.input.jobRole && !ctx.input.contactId)
      throw createApiServiceError('Provide contactId when assigning a job role.');
    let hasEvent = [
      ctx.input.eventType,
      ctx.input.eventDate,
      ctx.input.eventTime,
      ctx.input.eventEndDate,
      ctx.input.eventEndTime,
      ctx.input.timezone
    ].some(value => value !== undefined);
    if (hasEvent && !ctx.input.eventDate)
      throw createApiServiceError('Provide eventDate when creating a scheduled event.');
    let roleId = ctx.input.jobRole
      ? await client.resolveNamedId('/job-role', ctx.input.jobRole, 'Job role')
      : undefined;
    let typeId = ctx.input.eventType
      ? await client.resolveNamedId('/event-type', ctx.input.eventType, 'Event type')
      : undefined;
    if (ctx.input.contactId) await client.getContact(ctx.input.contactId);
    let data = pickDefined({
      jobTypeId: await client.resolveNamedId('/job-type', ctx.input.jobType, 'Job type'),
      brandId: ctx.input.brand
        ? await client.resolveNamedId('/brand', ctx.input.brand, 'Brand')
        : undefined,
      stage: ctx.input.jobStage,
      eventDate: ctx.input.eventDate,
      leadSourceId: ctx.input.source
        ? await client.resolveNamedId('/lead-source', ctx.input.source, 'Lead source')
        : undefined,
      leadNotes: ctx.input.notes,
      customFields: ctx.input.customFields
        ? await client.customFields(ctx.input.customFields, 'Job')
        : undefined
    });

    ctx.info({ message: 'Creating job in Tave', jobType: ctx.input.jobType });

    let result = await client.createJob(data);
    let jobId = String(result.id);
    let jobContactId: string | undefined;
    let eventId: string | undefined;
    try {
      if (ctx.input.contactId) {
        let link = await client.createJobContact(
          pickDefined({
            jobId,
            contactId: ctx.input.contactId,
            client: true,
            jobRoles: roleId ? [roleId] : undefined
          })
        );
        jobContactId = String(link.id);
      }
      if (hasEvent) {
        let event = await client.createEvent(
          pickDefined({
            jobId,
            typeId,
            startDate: ctx.input.eventDate,
            startTime: ctx.input.eventTime,
            endDate: ctx.input.eventEndDate,
            endTime: ctx.input.eventEndTime,
            timezoneName: ctx.input.timezone
          })
        );
        eventId = String(event.id);
      }
    } catch (error) {
      throw createApiServiceError(
        `Job ${jobId} was created${jobContactId ? ` with contact link ${jobContactId}` : ''}, but a related contact or event could not be created. Check this job before retrying. ${error instanceof Error ? error.message : ''}`,
        { reason: 'tave_partial_job_creation', parent: error }
      );
    }

    return {
      output: {
        jobId,
        jobType: textField(result, 'jobTypeName', 'job_type') ?? ctx.input.jobType,
        jobContactId,
        eventId,
        raw: result
      },
      message: `Successfully created **${ctx.input.jobType}** job${ctx.input.eventDate ? ` for ${ctx.input.eventDate}` : ''}.`
    };
  })
  .build();
