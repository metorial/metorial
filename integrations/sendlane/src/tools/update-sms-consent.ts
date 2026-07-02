import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let updateSmsConsent = SlateTool.create(spec, {
  name: 'Update SMS Consent',
  key: 'update_sms_consent',
  description: `Update the SMS consent status for a contact. SMS consent is required before Sendlane can send SMS messages to a contact.`
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      smsConsent: z.boolean().describe('Whether the contact has consented to receive SMS'),
      phone: z
        .string()
        .optional()
        .describe('Contact phone number (required if not already on file)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    await client.updateSmsConsent(ctx.input.contactId, ctx.input.smsConsent, ctx.input.phone);

    return {
      output: { success: true },
      message: `SMS consent ${ctx.input.smsConsent ? 'granted' : 'revoked'} for contact ${ctx.input.contactId}.`
    };
  })
  .build();
