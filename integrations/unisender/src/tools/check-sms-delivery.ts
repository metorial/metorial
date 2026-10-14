import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let checkSmsDelivery = SlateTool.create(spec, {
  name: 'Check SMS Delivery',
  key: 'check_sms_delivery',
  description: 'Check the delivery status of an SMS sent with send_sms.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      smsId: z
        .string()
        .min(1)
        .describe('sms_id returned by send_sms, kept as text to preserve compound message IDs')
    })
  )
  .output(z.object({ result: z.any().describe('SMS delivery status from Unisender') }))
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({ token: ctx.auth.token, locale: ctx.config.locale });
    let result = await client.checkSms(ctx.input.smsId);
    return {
      output: { result },
      message: `Retrieved SMS delivery status for ${ctx.input.smsId}`
    };
  })
  .build();
