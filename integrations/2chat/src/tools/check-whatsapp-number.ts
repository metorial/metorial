import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let checkWhatsAppNumber = SlateTool.create(spec, {
  name: 'Check WhatsApp Number',
  key: 'check_whatsapp_number',
  description: `Verify whether a phone number is registered and active on WhatsApp. Useful for validating contacts before sending messages.`,
  instructions: [
    'Both numbers must include the country code (e.g., +1234567890).',
    'The "from" number must be one of your connected WhatsApp numbers.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      toNumber: z.string().describe('Phone number to verify (with country code)')
    })
  )
  .output(
    z.object({
      isWhatsAppUser: z.boolean().describe('Whether the number is registered on WhatsApp'),
      numberExists: z.boolean().describe('Whether the phone number exists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });
    let result = await client.checkNumber(ctx.input.fromNumber, ctx.input.toNumber);

    let isWhatsApp = result.is_whatsapp_user ?? result.on_whatsapp ?? false;
    let exists = result.number_exists ?? result.exists ?? isWhatsApp;

    return {
      output: {
        isWhatsAppUser: isWhatsApp,
        numberExists: exists
      },
      message: isWhatsApp
        ? `**${ctx.input.toNumber}** is registered on WhatsApp.`
        : `**${ctx.input.toNumber}** is **not** registered on WhatsApp.`
    };
  })
  .build();
