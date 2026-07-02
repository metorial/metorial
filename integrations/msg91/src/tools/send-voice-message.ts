import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let sendVoiceMessage = SlateTool.create(spec, {
  name: 'Send Voice Message',
  key: 'send_voice_message',
  description: `Send voice SMS (text-to-speech) calls or initiate click-to-call (two-way call) sessions. Voice calls use pre-configured templates and support variable substitution for dynamic content.`,
  instructions: [
    'For text-to-speech calls, provide a voice template name and the recipient number.',
    'For click-to-call, provide the caller, destination A, and destination B numbers.',
    'Variables support "number" and "currency" types with formatting options.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      callType: z
        .enum(['voice_sms', 'click_to_call'])
        .describe(
          'Type of voice call: "voice_sms" for text-to-speech, "click_to_call" for two-way call'
        ),
      template: z.string().optional().describe('Voice template name (required for voice_sms)'),
      callerId: z.string().describe('Caller ID number with country code'),
      clientNumber: z
        .string()
        .optional()
        .describe('Recipient number with country code (required for voice_sms)'),
      destination: z
        .string()
        .optional()
        .describe('First party number (required for click_to_call)'),
      destinationB: z
        .array(z.string())
        .optional()
        .describe('Second party numbers (required for click_to_call)'),
      callbackUrl: z.string().optional().describe('Webhook URL for call status updates'),
      variables: z
        .record(
          z.string(),
          z.object({
            type: z.string().describe('Variable type: "number" or "currency"'),
            value: z.string().describe('Variable value'),
            asDigits: z
              .boolean()
              .optional()
              .describe('Read number digit by digit (for type "number")'),
            currencyCode: z
              .string()
              .optional()
              .describe('Currency code like "USD", "INR" (for type "currency")')
          })
        )
        .optional()
        .describe('Template variables for voice_sms calls')
    })
  )
  .output(
    z.object({
      response: z.any().describe('API response from MSG91')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    if (ctx.input.callType === 'click_to_call') {
      if (!ctx.input.destination || !ctx.input.destinationB) {
        throw new Error('destination and destinationB are required for click_to_call');
      }
      let result = await client.clickToCall({
        callerId: ctx.input.callerId,
        destination: ctx.input.destination,
        destinationB: ctx.input.destinationB
      });

      return {
        output: { response: result },
        message: `Click-to-call initiated between \`${ctx.input.destination}\` and \`${ctx.input.destinationB.join(', ')}\`.`
      };
    }

    if (!ctx.input.template || !ctx.input.clientNumber) {
      throw new Error('template and clientNumber are required for voice_sms');
    }
    let result = await client.sendVoiceCall({
      template: ctx.input.template,
      callerId: ctx.input.callerId,
      clientNumber: ctx.input.clientNumber,
      callbackUrl: ctx.input.callbackUrl,
      variables: ctx.input.variables
    });

    return {
      output: { response: result },
      message: `Voice SMS sent to **${ctx.input.clientNumber}** using template \`${ctx.input.template}\`.`
    };
  })
  .build();
