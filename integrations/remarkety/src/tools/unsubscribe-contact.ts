import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RemarketyClient } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeContactTool = SlateTool.create(spec, {
  name: 'Unsubscribe Contact',
  key: 'unsubscribe_contact',
  description:
    'Unsubscribe an email address, an SMS phone number, or both using the contact API. Optionally record the reason for the unsubscribe request.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Email address to unsubscribe. Supply email or smsPhoneNumber, or both.'),
      smsPhoneNumber: z
        .string()
        .optional()
        .describe(
          'SMS phone number to unsubscribe in E.164 format, for example +12021234567.'
        ),
      reason: z.string().optional().describe('Reason for the unsubscribe request')
    })
  )
  .output(z.object({ result: z.any().describe('Response returned by Remarkety') }))
  .handleInvocation(async ctx => {
    if (!ctx.input.email?.trim() && !ctx.input.smsPhoneNumber?.trim()) {
      throw createApiServiceError(
        'Supply an email address or an SMS phone number to unsubscribe.'
      );
    }
    if (
      ctx.input.smsPhoneNumber !== undefined &&
      !/^\+[1-9]\d{1,14}$/.test(ctx.input.smsPhoneNumber)
    ) {
      throw createApiServiceError(
        'Supply the SMS phone number in E.164 format, for example +12021234567.'
      );
    }
    let result = await new RemarketyClient({
      token: ctx.auth.token,
      storeId: ctx.auth.storeId
    }).unsubscribeContactApi(ctx.input);
    return {
      output: { result },
      message: 'Remarkety accepted the contact unsubscribe request.'
    };
  })
  .build();
