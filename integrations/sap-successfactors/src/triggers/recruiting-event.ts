import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recruitingEvent = SlateTrigger.create(spec, {
  name: 'Recruiting Event',
  key: 'recruiting_event',
  description:
    'Triggered by recruiting events including job requisition updates, offer approvals, and job application updates. Configure in SuccessFactors Integration Center using Intelligent Services as the trigger type with REST/JSON destination.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The type of recruiting event (e.g., "requisition_updated", "offer_approved", "application_updated")'
        ),
      eventId: z.string().describe('Unique identifier for the event'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Full event payload from SuccessFactors')
    })
  )
  .output(
    z.object({
      requisitionId: z.string().optional().describe('Job requisition ID if applicable'),
      applicationId: z.string().optional().describe('Job application ID if applicable'),
      candidateId: z.string().optional().describe('Candidate ID if applicable'),
      jobTitle: z.string().optional().describe('Job title if available'),
      status: z.string().optional().describe('Current status of the recruiting entity'),
      applicantName: z.string().optional().describe('Applicant name if available')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = resolveRecruitingEventType(data);
      let eventId =
        extractField(data, ['eventId', 'event_id', 'externalEventId']) ||
        `${eventType}_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload } = ctx.input;

      let requisitionId = extractField(rawPayload, [
        'jobReqId',
        'requisitionId',
        'requisition_id'
      ]);
      let applicationId = extractField(rawPayload, [
        'applicationId',
        'application_id',
        'jobApplicationId'
      ]);
      let candidateId = extractField(rawPayload, ['candidateId', 'candidate_id']);
      let jobTitle = extractField(rawPayload, ['jobTitle', 'title', 'positionTitle']);
      let status = extractField(rawPayload, [
        'status',
        'applicationStatus',
        'requisitionStatus'
      ]);
      let applicantName = extractField(rawPayload, [
        'candidateName',
        'applicantName',
        'fullName'
      ]);

      return {
        type: `recruiting.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          requisitionId: requisitionId !== undefined ? String(requisitionId) : undefined,
          applicationId: applicationId !== undefined ? String(applicationId) : undefined,
          candidateId: candidateId !== undefined ? String(candidateId) : undefined,
          jobTitle: typeof jobTitle === 'string' ? jobTitle : undefined,
          status: typeof status === 'string' ? status : undefined,
          applicantName: typeof applicantName === 'string' ? applicantName : undefined
        }
      };
    }
  })
  .build();

let resolveRecruitingEventType = (data: Record<string, unknown>): string => {
  let eventType = extractField(data, ['eventType', 'event_type', 'eventName', 'type']);

  if (typeof eventType === 'string') {
    let normalized = eventType.toLowerCase();
    if (normalized.includes('requisition')) return 'requisition_updated';
    if (normalized.includes('offer') && normalized.includes('approv')) return 'offer_approved';
    if (normalized.includes('application')) return 'application_updated';
    return normalized.replace(/\s+/g, '_');
  }

  return 'unknown';
};

let extractField = (data: Record<string, unknown>, keys: string[]): unknown => {
  for (let key of keys) {
    let value = data[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};
