import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let payeeSchema = z.object({
  payeeId: z.string().describe('Payee ID'),
  name: z.string().describe('Payee name'),
  transferAccountId: z
    .string()
    .nullable()
    .optional()
    .describe('Linked transfer account ID (if this payee represents a transfer)'),
  deleted: z.boolean().describe('Whether deleted')
});

export let listPayees = SlateTool.create(spec, {
  name: 'List Payees',
  key: 'list_payees',
  description: `Retrieve all payees for a budget. Payees that represent account transfers include the linked account ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      budgetId: z.string().optional().describe('Budget ID. Defaults to the configured budget.')
    })
  )
  .output(
    z.object({
      payees: z.array(payeeSchema).describe('List of payees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let { payees } = await client.getPayees(budgetId);

    let mapped = payees.map((p: any) => ({
      payeeId: p.id,
      name: p.name,
      transferAccountId: p.transfer_account_id,
      deleted: p.deleted
    }));

    let active = mapped.filter((p: any) => !p.deleted);
    return {
      output: { payees: mapped },
      message: `Found **${active.length}** active payee(s)`
    };
  })
  .build();
