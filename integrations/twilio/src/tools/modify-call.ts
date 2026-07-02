import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

export let modifyCall = SlateTool.create(spec, {
  name: 'Modify Call',
  key: 'modify_call',
  description: `Modify an in-progress call. Redirect the call to new TwiML instructions, end the call, or cancel a queued call. Useful for programmatic call control like transferring, hanging up, or changing the call flow mid-call.`,
  instructions: [
    'To end a call, set "status" to "completed".',
    'To cancel a queued call, set "status" to "canceled".',
    'To redirect, provide a new "twimlUrl" or "twiml".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      callSid: z.string().describe('SID of the call to modify (starts with CA).'),
      status: z
        .enum(['completed', 'canceled'])
        .optional()
        .describe(
          'Set to "completed" to end an in-progress call, or "canceled" to cancel a queued call.'
        ),
      twimlUrl: z
        .string()
        .optional()
        .describe('New URL returning TwiML instructions to redirect the call to.'),
      twiml: z
        .string()
        .optional()
        .describe('Inline TwiML instructions to redirect the call to.')
    })
  )
  .output(
    z.object({
      callSid: z.string().describe('SID of the modified call'),
      status: z.string().describe('Updated call status'),
      to: z.string().describe('Called party number'),
      from: z.string().describe('Caller number')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.status && !ctx.input.twimlUrl && !ctx.input.twiml) {
      throw twilioServiceError('Provide status, twimlUrl, or twiml to modify a call.');
    }

    if (ctx.input.twimlUrl && ctx.input.twiml) {
      throw twilioServiceError('Provide either twimlUrl or twiml, not both.');
    }

    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.updateCall(ctx.input.callSid, {
      status: ctx.input.status,
      url: ctx.input.twimlUrl,
      twiml: ctx.input.twiml
    });

    return {
      output: {
        callSid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from
      },
      message: `Call **${result.sid}** updated to status **${result.status}**.`
    };
  })
  .build();
