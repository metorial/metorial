import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

let nccoActionSchema = z
  .record(z.string(), z.unknown())
  .describe('NCCO action object (e.g., {"action": "talk", "text": "Hello"})');

export let makeCall = SlateTool.create(spec, {
  name: 'Make Call',
  key: 'make_call',
  description: `Initiate an outbound voice call using the Vonage Voice API. Control call flow with NCCO (Nexmo Call Control Objects) actions or a remote answer URL.
Supports calling phone numbers (PSTN), SIP endpoints, and WebSocket connections.
Requires the **API Key, Secret & Application JWT** auth method.`,
  instructions: [
    'Provide either an inline "ncco" array or an "answerUrl" - not both.',
    'Common NCCO actions: "talk" (text-to-speech), "stream" (play audio), "input" (collect DTMF/speech), "record", "connect", "conversation".',
    'Phone numbers must be in E.164 format without the + prefix.'
  ],
  constraints: [
    'Maximum call length is configurable via lengthTimer (default 7200 seconds).',
    'Ringing timeout is configurable via ringingTimer (default 60 seconds).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      toNumber: z
        .string()
        .describe('Destination phone number in E.164 format (e.g., "14155550100")'),
      fromNumber: z.string().describe('Caller ID phone number in E.164 format'),
      ncco: z
        .array(nccoActionSchema)
        .optional()
        .describe('Inline NCCO actions array to control the call flow'),
      answerUrl: z
        .string()
        .optional()
        .describe('URL returning NCCO JSON to control the call (alternative to inline ncco)'),
      eventUrl: z.string().optional().describe('Webhook URL for call status events'),
      machineDetection: z
        .enum(['continue', 'hangup'])
        .optional()
        .describe('Answering machine detection behavior'),
      lengthTimer: z
        .number()
        .optional()
        .describe('Maximum call duration in seconds (default: 7200)'),
      ringingTimer: z.number().optional().describe('Ringing timeout in seconds (default: 60)')
    })
  )
  .output(
    z.object({
      callUuid: z.string().describe('Unique identifier for the call'),
      status: z.string().describe('Initial call status'),
      direction: z.string().describe('Call direction (outbound)'),
      conversationUuid: z.string().describe('Conversation UUID for the call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      applicationId: ctx.auth.applicationId,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.createCall({
      to: [{ type: 'phone', number: ctx.input.toNumber }],
      from: { type: 'phone', number: ctx.input.fromNumber },
      ncco: ctx.input.ncco,
      answerUrl: ctx.input.answerUrl ? [ctx.input.answerUrl] : undefined,
      eventUrl: ctx.input.eventUrl ? [ctx.input.eventUrl] : undefined,
      machineDetection: ctx.input.machineDetection,
      lengthTimer: ctx.input.lengthTimer,
      ringingTimer: ctx.input.ringingTimer
    });

    return {
      output: result,
      message: `Outbound call initiated to **${ctx.input.toNumber}**. Call UUID: \`${result.callUuid}\`, Status: **${result.status}**`
    };
  })
  .build();
