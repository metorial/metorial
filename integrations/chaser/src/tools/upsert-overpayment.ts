import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { overpaymentInputSchema, overpaymentOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

let mapOverpaymentOutput = (data: any) => ({
  overpaymentInternalId: data.id || '',
  overpaymentId: data.overpaymentId || '',
  remainingCredit: data.remainingCredit ?? 0,
  date: data.date || '',
  status: data.status || '',
  total: data.total ?? 0,
  currencyCode: data.currencyCode || '',
  customerExternalId: data.customerExternalId || '',
  customerName: data.customerName ?? null
});

export let upsertOverpayment = SlateTool.create(spec, {
  name: 'Create or Update Overpayment',
  key: 'upsert_overpayment',
  description: `Create a new overpayment record or update an existing one in Chaser. Overpayments track excess payments made by customers and their remaining credit balance.`,
  instructions: [
    'To update an existing overpayment, provide the overpaymentInternalId (Chaser internal ID) or "ext_{overpaymentId}".',
    'When creating, all fields in the overpayment object are required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      overpaymentInternalId: z
        .string()
        .optional()
        .describe(
          'Internal Chaser overpayment ID or "ext_{overpaymentId}" for updates. Omit to create.'
        ),
      overpayment: overpaymentInputSchema.describe('Overpayment data')
    })
  )
  .output(overpaymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.overpaymentInternalId) {
      result = await client.updateOverpayment(
        ctx.input.overpaymentInternalId,
        ctx.input.overpayment
      );
    } else {
      result = await client.createOverpayment(ctx.input.overpayment);
    }

    let output = mapOverpaymentOutput(result);
    let action = ctx.input.overpaymentInternalId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} overpayment **${output.overpaymentId}** with remaining credit ${output.remainingCredit} ${output.currencyCode}.`
    };
  })
  .build();
