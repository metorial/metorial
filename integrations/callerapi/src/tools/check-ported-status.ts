import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkPortedStatus = SlateTool.create(spec, {
  name: 'Check Ported Status',
  key: 'check_ported_status',
  description: `Check whether a phone number has been ported to a different carrier and retrieve the most recent porting date. Useful for verifying carrier changes and detecting potential SIM-swap activity.`,
  instructions: ['Phone numbers must be in E.164 format (e.g., +16502530000)'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +16502530000)')
    })
  )
  .output(
    z.object({
      ported: z
        .boolean()
        .optional()
        .describe('Whether the number has been ported from its original network'),
      portedDate: z.string().optional().describe('Timestamp of the most recent porting event'),
      portedDateType: z
        .string()
        .optional()
        .describe('Reliability of the porting date: exact, estimate, or unknown'),
      status: z.number().optional().describe('Status code (0 = success)'),
      statusMessage: z.string().optional().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPortedStatus(ctx.input.phoneNumber);

    return {
      output: {
        ported: result.ported,
        portedDate: result.ported_date,
        portedDateType: result.ported_date_type,
        status: result.status,
        statusMessage: result.status_message
      },
      message: result.ported
        ? `Phone number **${ctx.input.phoneNumber}** has been ported. Last ported: **${result.ported_date ?? 'Unknown date'}** (${result.ported_date_type ?? 'unknown'} precision).`
        : `Phone number **${ctx.input.phoneNumber}** has **not** been ported.`
    };
  })
  .build();
