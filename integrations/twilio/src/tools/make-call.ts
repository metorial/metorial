import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

export let makeCall = SlateTool.create(spec, {
  name: 'Make Call',
  key: 'make_call',
  description: `Initiate an outbound phone call via Twilio. The call flow is controlled by a TwiML URL, inline TwiML, or a TwiML Application SID. Supports call recording, machine detection, and status callbacks.`,
  instructions: [
    'Exactly one of "twimlUrl", "twiml", or "applicationSid" must be provided to control the call flow.',
    'Use inline "twiml" for simple call flows, e.g. "<Response><Say>Hello!</Say></Response>".'
  ],
  constraints: [
    'The "from" number must be a valid Twilio phone number or verified caller ID on your account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z
        .string()
        .describe('Destination phone number in E.164 format, SIP URI, or Client identifier.'),
      from: z
        .string()
        .describe('Twilio phone number or verified caller ID to display as the caller.'),
      twimlUrl: z
        .string()
        .optional()
        .describe('URL returning TwiML instructions for the call.'),
      twiml: z
        .string()
        .optional()
        .describe('Inline TwiML instructions (e.g. "<Response><Say>Hello</Say></Response>").'),
      applicationSid: z
        .string()
        .optional()
        .describe('SID of a TwiML Application to handle the call.'),
      timeout: z
        .number()
        .optional()
        .describe('Seconds to wait for an answer before giving up (default 60).'),
      record: z.boolean().optional().describe('Whether to record the entire call.'),
      machineDetection: z
        .enum(['Enable', 'DetectMessageEnd'])
        .optional()
        .describe('Enable answering machine detection.'),
      statusCallbackUrl: z
        .string()
        .optional()
        .describe('URL to receive call status webhook events.'),
      statusCallbackEvents: z
        .array(z.enum(['initiated', 'ringing', 'answered', 'completed']))
        .optional()
        .describe('Which call events to send to the status callback URL.'),
      callerId: z
        .string()
        .optional()
        .describe('Override the caller ID displayed to the called party.')
    })
  )
  .output(
    z.object({
      callSid: z.string().describe('Unique SID of the created call'),
      status: z.string().describe('Current call status'),
      to: z.string().describe('Called party number'),
      from: z.string().describe('Caller number'),
      direction: z.string().describe('Call direction'),
      dateCreated: z.string().nullable().describe('Date the call was created'),
      startTime: z.string().nullable().describe('Time the call started')
    })
  )
  .handleInvocation(async ctx => {
    let callFlowInputs = [
      ctx.input.twimlUrl ? 'twimlUrl' : undefined,
      ctx.input.twiml ? 'twiml' : undefined,
      ctx.input.applicationSid ? 'applicationSid' : undefined
    ].filter(Boolean);

    if (callFlowInputs.length !== 1) {
      throw twilioServiceError(
        'Exactly one of twimlUrl, twiml, or applicationSid is required to make a call.'
      );
    }

    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.makeCall({
      to: ctx.input.to,
      from: ctx.input.from,
      url: ctx.input.twimlUrl,
      twiml: ctx.input.twiml,
      applicationSid: ctx.input.applicationSid,
      timeout: ctx.input.timeout,
      record: ctx.input.record,
      machineDetection: ctx.input.machineDetection,
      statusCallback: ctx.input.statusCallbackUrl,
      statusCallbackEvent: ctx.input.statusCallbackEvents,
      callerId: ctx.input.callerId
    });

    return {
      output: {
        callSid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        direction: result.direction,
        dateCreated: result.date_created,
        startTime: result.start_time
      },
      message: `Call **${result.sid}** initiated to **${ctx.input.to}** with status **${result.status}**.`
    };
  })
  .build();
