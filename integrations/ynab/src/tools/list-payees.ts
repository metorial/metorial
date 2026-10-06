import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetInput, deltaInput, milliunits } from '../lib/validation';
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
      lastKnowledgeOfServer: deltaInput,
      budgetId: budgetInput
    })
  )
  .output(
    z.object({
      serverKnowledge: milliunits
        .nonnegative()
        .optional()
        .describe('Knowledge returned by this endpoint for subsequent delta requests.'),
      payees: z.array(payeeSchema).describe('List of payees')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getPayees(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.lastKnowledgeOfServer
    );
    return {
      output: {
        payees: data.payees.map(p => ({
          payeeId: p.id,
          name: p.name,
          transferAccountId: p.transfer_account_id,
          deleted: p.deleted
        })),
        serverKnowledge: data.serverKnowledge
      },
      message: `Returned ${data.payees.length} payee record(s).`
    };
  })
  .build();
