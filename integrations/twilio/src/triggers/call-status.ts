import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { parseFormUrlEncoded } from '../lib/webhook-parser';
import { spec } from '../spec';

export let callStatus = SlateTrigger.create(spec, {
  name: 'Call Status Update',
  key: 'call_status',
  description:
    'Triggered when a voice call status changes (initiated, ringing, answered, completed). Configure the status callback URL on individual calls or on your Twilio phone number.'
})
  .input(
    z.object({
      callSid: z.string().describe('Unique SID of the call'),
      callStatus: z.string().describe('New call status'),
      from: z.string().describe('Caller phone number'),
      to: z.string().describe('Called phone number'),
      direction: z.string().describe('Call direction'),
      accountSid: z.string().describe('Account SID'),
      callDuration: z
        .string()
        .optional()
        .describe('Duration of the call in seconds (on completed)'),
      recordingUrl: z.string().optional().describe('Recording URL if the call was recorded'),
      recordingSid: z.string().optional().describe('Recording SID if the call was recorded'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      sequenceNumber: z.string().optional().describe('Sequence number for ordering events')
    })
  )
  .output(
    z.object({
      callSid: z.string().describe('Unique SID of the call'),
      status: z
        .string()
        .describe(
          'New call status (initiated, ringing, answered, completed, busy, failed, no-answer, canceled)'
        ),
      from: z.string().describe('Caller phone number'),
      to: z.string().describe('Called phone number'),
      direction: z.string().describe('Call direction'),
      duration: z
        .string()
        .nullable()
        .describe('Call duration in seconds (on completed event)'),
      recordingUrl: z.string().nullable().describe('Recording URL if the call was recorded'),
      recordingSid: z.string().nullable().describe('Recording SID'),
      timestamp: z.string().nullable().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let text = await ctx.request.text();
      let data = parseFormUrlEncoded(text);

      return {
        inputs: [
          {
            callSid: data.CallSid || '',
            callStatus: data.CallStatus || '',
            from: data.From || data.Caller || '',
            to: data.To || data.Called || '',
            direction: data.Direction || '',
            accountSid: data.AccountSid || '',
            callDuration: data.CallDuration,
            recordingUrl: data.RecordingUrl,
            recordingSid: data.RecordingSid,
            timestamp: data.Timestamp,
            sequenceNumber: data.SequenceNumber
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `call.${ctx.input.callStatus.replace('-', '_')}`,
        id: `${ctx.input.callSid}_${ctx.input.callStatus}_${ctx.input.sequenceNumber || '0'}`,
        output: {
          callSid: ctx.input.callSid,
          status: ctx.input.callStatus,
          from: ctx.input.from,
          to: ctx.input.to,
          direction: ctx.input.direction,
          duration: ctx.input.callDuration || null,
          recordingUrl: ctx.input.recordingUrl || null,
          recordingSid: ctx.input.recordingSid || null,
          timestamp: ctx.input.timestamp || null
        }
      };
    }
  })
  .build();
