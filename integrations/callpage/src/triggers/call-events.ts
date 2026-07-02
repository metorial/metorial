import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callEvents = SlateTrigger.create(spec, {
  name: 'Call Events',
  key: 'call_events',
  description:
    'Receives webhook events for call lifecycle changes including new calls, scheduled calls, completed calls, missed calls, and data submissions from visitors.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of call event'),
      callId: z.string().describe('ID of the call'),
      widgetId: z.string().optional().describe('ID of the widget'),
      phoneNumber: z.string().optional().describe('Caller phone number'),
      status: z.string().optional().describe('Call status'),
      scheduledAt: z.string().optional().describe('Scheduled time for the call'),
      attempts: z.number().optional().describe('Number of call attempts'),
      managerName: z.string().optional().describe('Name of the manager who handled the call'),
      billingTime: z.number().optional().describe('Billing time in seconds'),
      recordingUrl: z.string().optional().describe('URL to call recording'),
      direction: z.string().optional().describe('Call direction'),
      email: z.string().optional().describe('Visitor email address'),
      messageContent: z.string().optional().describe('Message content from visitor'),
      formFields: z
        .array(z.any())
        .optional()
        .describe('Additional form field data submitted by visitor'),
      rawPayload: z.any().describe('The complete raw webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('ID of the call'),
      widgetId: z.string().optional().describe('ID of the widget'),
      phoneNumber: z.string().optional().describe('Caller phone number'),
      status: z.string().optional().describe('Call status'),
      scheduledAt: z.string().optional().describe('Scheduled time for the call'),
      attempts: z.number().optional().describe('Number of call attempts'),
      managerName: z.string().optional().describe('Name of the handling manager'),
      billingTime: z.number().optional().describe('Billing time in seconds'),
      recordingUrl: z.string().optional().describe('URL to call recording'),
      direction: z.string().optional().describe('Call direction'),
      email: z.string().optional().describe('Visitor email address'),
      messageContent: z.string().optional().describe('Visitor message content'),
      formFields: z.array(z.any()).optional().describe('Additional form field data'),
      dashboardUrl: z
        .string()
        .optional()
        .describe('Link to the call in the CallPage dashboard')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      let eventType = inferEventType(data);
      let callId = String(data.call_id || data.id || '');
      let widgetId = data.widget_id ? String(data.widget_id) : undefined;

      return {
        inputs: [
          {
            eventType,
            callId,
            widgetId,
            phoneNumber: data.phone_number || data.tel || undefined,
            status: data.status || undefined,
            scheduledAt: data.scheduled_at || data.scheduled_time || undefined,
            attempts: data.attempts || data.call_attempts || undefined,
            managerName: data.manager_name || data.manager?.name || undefined,
            billingTime: data.billing_time || undefined,
            recordingUrl: data.recording_url || data.recording || undefined,
            direction: data.direction || undefined,
            email: data.email || undefined,
            messageContent: data.message || data.message_content || undefined,
            formFields: data.fields || data.form_fields || undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `call.${input.eventType}`,
        id: `${input.callId}-${input.eventType}`,
        output: {
          callId: input.callId,
          widgetId: input.widgetId,
          phoneNumber: input.phoneNumber,
          status: input.status,
          scheduledAt: input.scheduledAt,
          attempts: input.attempts,
          managerName: input.managerName,
          billingTime: input.billingTime,
          recordingUrl: input.recordingUrl,
          direction: input.direction,
          email: input.email,
          messageContent: input.messageContent,
          formFields: input.formFields,
          dashboardUrl:
            input.rawPayload?.dashboard_url || input.rawPayload?.call_url || undefined
        }
      };
    }
  })
  .build();

let inferEventType = (data: any): string => {
  if (data.event_type || data.event) {
    let raw = String(data.event_type || data.event).toLowerCase();
    if (raw.includes('scheduled')) return 'scheduled';
    if (raw.includes('new')) return 'new';
    if (raw.includes('missed')) return 'missed';
    if (raw.includes('completed') || raw.includes('complete')) return 'completed';
    if (raw.includes('data') || raw.includes('added')) return 'data_added';
    if (raw.includes('message')) return 'new_message';
    return raw.replace(/\s+/g, '_');
  }

  if (data.status) {
    let status = String(data.status).toLowerCase();
    if (status === 'completed') return 'completed';
    if (status === 'scheduled') return 'scheduled';
    if (status === 'new') return 'new';
    if (['manager-failed', 'user-failed', 'failed'].includes(status)) return 'missed';
  }

  if (data.message || data.message_content) return 'new_message';
  if (data.fields || data.form_fields) return 'data_added';
  if (data.scheduled_at || data.scheduled_time) return 'scheduled';

  return 'unknown';
};
