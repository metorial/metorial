import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callFinished = SlateTrigger.create(spec, {
  name: 'Call Finished',
  key: 'call_finished',
  description:
    'Triggers when a call sequence with a lead finishes. Configure the webhook URL in your Leverly dashboard under HTTP Postback settings to receive call result data.'
})
  .input(
    z.object({
      callId: z.string().optional().describe('Unique identifier for the call'),
      phone: z.string().optional().describe('Lead phone number'),
      firstName: z.string().optional().describe('Lead first name'),
      lastName: z.string().optional().describe('Lead last name'),
      email: z.string().optional().describe('Lead email address'),
      callStatus: z.string().optional().describe('Status or outcome of the call'),
      callDuration: z.string().optional().describe('Duration of the call'),
      callResult: z.string().optional().describe('Result or disposition of the call'),
      leadSource: z.string().optional().describe('Source of the lead'),
      groupId: z.string().optional().describe('Group the call was routed to'),
      repName: z.string().optional().describe('Name of the sales rep who handled the call'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      rawPayload: z
        .record(z.string(), z.any())
        .describe('Full raw payload from the Leverly HTTP postback')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique identifier for the call'),
      phone: z.string().describe('Lead phone number'),
      firstName: z.string().optional().describe('Lead first name'),
      lastName: z.string().optional().describe('Lead last name'),
      email: z.string().optional().describe('Lead email address'),
      callStatus: z.string().optional().describe('Status or outcome of the call'),
      callDuration: z.string().optional().describe('Duration of the call'),
      callResult: z.string().optional().describe('Result or disposition of the call'),
      leadSource: z.string().optional().describe('Source of the lead'),
      groupId: z.string().optional().describe('Group the call was routed to'),
      repName: z.string().optional().describe('Name of the sales rep who handled the call'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      rawPayload: z
        .record(z.string(), z.any())
        .describe('Full raw payload from the Leverly HTTP postback')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let data: Record<string, any> = {};

      if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, any>;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        for (let [key, value] of params.entries()) {
          data[key] = value;
        }
      } else {
        // Attempt to parse as form-urlencoded by default (Leverly typically sends form data)
        let text = await ctx.request.text();
        try {
          data = JSON.parse(text);
        } catch {
          let params = new URLSearchParams(text);
          for (let [key, value] of params.entries()) {
            data[key] = value;
          }
        }
      }

      // Extract known fields from the payload with common field name variations
      let callId = data.callId || data.call_id || data.CallId || data.id || '';
      let phone = data.Phone1 || data.phone || data.Phone || data.phone1 || '';
      let firstName = data.firstName || data.FirstName || data.first_name || '';
      let lastName = data.lastName || data.LastName || data.last_name || '';
      let email = data.email || data.Email || '';
      let callStatus =
        data.callStatus || data.call_status || data.CallStatus || data.status || '';
      let callDuration =
        data.callDuration || data.call_duration || data.CallDuration || data.duration || '';
      let callResult =
        data.callResult || data.call_result || data.CallResult || data.result || '';
      let leadSource = data.leadSource || data.lead_source || data.LeadSource || '';
      let groupId = data.groupId || data.group_id || data.GroupId || '';
      let repName = data.repName || data.rep_name || data.RepName || data.agent || '';
      let recordingUrl =
        data.recordingUrl || data.recording_url || data.RecordingUrl || data.recording || '';

      // Generate a unique ID if none provided
      let eventId = callId || `${phone}-${Date.now()}`;

      return {
        inputs: [
          {
            callId: String(eventId),
            phone: String(phone),
            firstName: firstName ? String(firstName) : undefined,
            lastName: lastName ? String(lastName) : undefined,
            email: email ? String(email) : undefined,
            callStatus: callStatus ? String(callStatus) : undefined,
            callDuration: callDuration ? String(callDuration) : undefined,
            callResult: callResult ? String(callResult) : undefined,
            leadSource: leadSource ? String(leadSource) : undefined,
            groupId: groupId ? String(groupId) : undefined,
            repName: repName ? String(repName) : undefined,
            recordingUrl: recordingUrl ? String(recordingUrl) : undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'call.finished',
        id: ctx.input.callId || `unknown-${Date.now()}`,
        output: {
          callId: ctx.input.callId || '',
          phone: ctx.input.phone || '',
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          callStatus: ctx.input.callStatus,
          callDuration: ctx.input.callDuration,
          callResult: ctx.input.callResult,
          leadSource: ctx.input.leadSource,
          groupId: ctx.input.groupId,
          repName: ctx.input.repName,
          recordingUrl: ctx.input.recordingUrl,
          rawPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
