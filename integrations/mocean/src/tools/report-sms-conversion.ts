import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

export let reportSmsConversion = SlateTool.create(spec, {
  name: 'Report SMS Conversion',
  key: 'report_sms_conversion',
  description:
    'Report whether a recipient received an SMS so Mocean can improve delivery routing. Use the message ID returned by send_sms and actual recipient feedback.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      messageId: z.string().min(1).describe('Message ID returned by send_sms'),
      delivered: z.boolean().describe('Whether the recipient confirmed receiving the SMS'),
      timestamp: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
        .optional()
        .describe(
          'Time of recipient feedback in YYYY-MM-DD HH:mm:ss format; defaults to submission time'
        )
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('SMS message ID'),
      delivered: z.boolean().describe('Reported delivery outcome'),
      status: z.number().describe('Provider response status (0 = success)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient(ctx.auth);
    let result = await client.reportSmsConversion(ctx.input);
    return {
      output: {
        messageId: ctx.input.messageId,
        delivered: ctx.input.delivered,
        status: result.status
      },
      message: `Reported SMS **${ctx.input.messageId}** as **${ctx.input.delivered ? 'received' : 'not received'}**.`
    };
  })
  .build();
