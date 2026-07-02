import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { parseFormUrlEncoded } from '../lib/webhook-parser';
import { spec } from '../spec';

export let incomingCall = SlateTrigger.create(spec, {
  name: 'Incoming Call',
  key: 'incoming_call',
  description:
    'Triggered when a voice call is received on a Twilio phone number. Configure the Voice webhook URL on your Twilio phone number to point to the provided webhook URL.'
})
  .input(
    z.object({
      callSid: z.string().describe('Unique SID of the call'),
      from: z.string().describe('Caller phone number'),
      to: z.string().describe('Your Twilio phone number that received the call'),
      callStatus: z.string().describe('Current call status'),
      direction: z.string().describe('Call direction'),
      accountSid: z.string().describe('Account SID'),
      callerName: z.string().optional().describe('CNAM caller name if available'),
      fromCity: z.string().optional().describe('Caller city'),
      fromState: z.string().optional().describe('Caller state'),
      fromCountry: z.string().optional().describe('Caller country'),
      forwardedFrom: z
        .string()
        .optional()
        .describe('Forwarding number if the call was forwarded')
    })
  )
  .output(
    z.object({
      callSid: z.string().describe('Unique SID of the call'),
      from: z.string().describe('Caller phone number'),
      to: z.string().describe('Your Twilio phone number'),
      callStatus: z.string().describe('Call status at the time of the webhook'),
      direction: z.string().describe('Call direction (inbound)'),
      callerName: z.string().nullable().describe('CNAM caller name'),
      fromCity: z.string().nullable().describe('Caller city'),
      fromState: z.string().nullable().describe('Caller state'),
      fromCountry: z.string().nullable().describe('Caller country'),
      forwardedFrom: z.string().nullable().describe('Forwarding number')
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
            from: data.From || data.Caller || '',
            to: data.To || data.Called || '',
            callStatus: data.CallStatus || '',
            direction: data.Direction || 'inbound',
            accountSid: data.AccountSid || '',
            callerName: data.CallerName,
            fromCity: data.FromCity || data.CallerCity,
            fromState: data.FromState || data.CallerState,
            fromCountry: data.FromCountry || data.CallerCountry,
            forwardedFrom: data.ForwardedFrom
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'call.incoming',
        id: ctx.input.callSid,
        output: {
          callSid: ctx.input.callSid,
          from: ctx.input.from,
          to: ctx.input.to,
          callStatus: ctx.input.callStatus,
          direction: ctx.input.direction,
          callerName: ctx.input.callerName || null,
          fromCity: ctx.input.fromCity || null,
          fromState: ctx.input.fromState || null,
          fromCountry: ctx.input.fromCountry || null,
          forwardedFrom: ctx.input.forwardedFrom || null
        }
      };
    }
  })
  .build();
