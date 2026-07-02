import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

let mcSayAction = z.object({
  action: z.literal('say'),
  language: z
    .string()
    .describe(
      'Language code (e.g., "en-US", "en-GB", "de-DE", "cmn-CN", "ja-JP", "ko-KR", "ms-MY", "id-ID", "th-TH", "vi-VN", "ru-RU")'
    ),
  text: z.string().describe('Text content to speak'),
  'barge-in': z.boolean().optional().describe('Allow caller to skip by pressing a digit'),
  'clear-digit-cache': z.boolean().optional().describe('Clear previously buffered DTMF input')
});

let mcPlayAction = z.object({
  action: z.literal('play'),
  file: z
    .union([z.string(), z.array(z.string())])
    .describe('URL to audio file, or array of URLs'),
  'barge-in': z.boolean().optional(),
  'clear-digit-cache': z.boolean().optional()
});

let mcCollectAction = z.object({
  action: z.literal('collect'),
  'event-url': z.string().describe('Webhook URL to receive collected digits'),
  min: z.number().describe('Minimum digits required'),
  max: z.number().describe('Maximum digits to collect'),
  timeout: z.number().describe('Timeout in milliseconds per digit'),
  terminators: z.string().optional().describe('Digit(s) that end input early (e.g., "#")')
});

let mcSleepAction = z.object({
  action: z.literal('sleep'),
  duration: z.number().describe('Pause duration in milliseconds')
});

let mcDialAction = z.object({
  action: z.literal('dial'),
  to: z
    .union([z.string(), z.array(z.string())])
    .describe('Destination phone number(s) to connect'),
  from: z.string().optional().describe('Caller ID for the outbound leg'),
  'dial-sequentially': z.boolean().optional().describe('Dial numbers one at a time in order')
});

let mcRecordAction = z.object({
  action: z.literal('record')
});

let mcAction = z.union([
  mcSayAction,
  mcPlayAction,
  mcCollectAction,
  mcSleepAction,
  mcDialAction,
  mcRecordAction
]);

export let makeVoiceCall = SlateTool.create(spec, {
  name: 'Make Voice Call',
  key: 'make_voice_call',
  description: `Initiate a programmable outbound voice call controlled by Mocean Command (MC) instructions. MC is a JSON array of actions executed sequentially: **say** (text-to-speech), **play** (audio file), **collect** (DTMF input), **sleep** (pause), **dial** (connect to a number), and **record** (call recording).`,
  instructions: [
    'The command array is executed sequentially - when one action completes, the next begins',
    'The call ends when all actions complete',
    'For text-to-speech, supported languages include: en-US, en-GB, de-DE, cmn-CN, ja-JP, ko-KR, ms-MY, id-ID, th-TH, vi-VN, ru-RU'
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
        .describe('Destination phone number with country code (e.g., "60123456789")'),
      command: z
        .array(mcAction)
        .describe('Array of Mocean Command (MC) actions defining the call flow'),
      from: z.string().optional().describe('Caller ID / originating phone number'),
      eventUrl: z.string().optional().describe('Webhook URL for receiving call status events')
    })
  )
  .output(
    z.object({
      calls: z
        .array(
          z.object({
            status: z.number().describe('Status code (0 = success)'),
            receiver: z.string().optional().describe('Destination phone number'),
            sessionUuid: z.string().optional().describe('Voice session identifier'),
            callUuid: z
              .string()
              .optional()
              .describe('Individual call identifier (used for hangup/recording)')
          })
        )
        .describe('Array of call results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.makeVoiceCall({
      to: ctx.input.to,
      command: ctx.input.command,
      from: ctx.input.from,
      eventUrl: ctx.input.eventUrl
    });

    let calls = (result.calls || []).map((call: any) => ({
      status: call.status,
      receiver: call.receiver,
      sessionUuid: call.session_uuid,
      callUuid: call.call_uuid
    }));

    let successCount = calls.filter((c: any) => c.status === 0).length;

    return {
      output: { calls },
      message: `Voice call initiated to **${ctx.input.to}**. ${successCount} call(s) started successfully.`
    };
  })
  .build();
