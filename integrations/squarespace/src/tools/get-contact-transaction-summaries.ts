import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactTransactionSummaries = SlateTool.create(spec, {
  name: 'Get Contact Transaction Summaries',
  key: 'get_contact_transaction_summaries',
  description: `Retrieve Squarespace Analytics transaction summaries grouped by contact. Use this to understand order and donation activity for one or more Contacts API contacts.`,
  constraints: ['Provide between 1 and 1000 contact IDs'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactIds: z
        .array(z.string())
        .min(1)
        .max(1000)
        .describe('Contact IDs to summarize, up to 1000')
    })
  )
  .output(
    z.object({
      transactionSummaries: z
        .array(z.any())
        .describe('Transaction summary wrappers grouped by contactId')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let transactionSummaries = await client.getContactTransactionSummaries(
      ctx.input.contactIds
    );

    return {
      output: {
        transactionSummaries
      },
      message: `Retrieved transaction summaries for **${ctx.input.contactIds.length}** contact(s).`
    };
  })
  .build();
