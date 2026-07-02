import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let listTransactionTypes = SlateTool.create(spec, {
  name: 'List Transaction Types',
  key: 'list_transaction_types',
  description: `List available transaction types and their associated event types configured in your Spondyr application. Use this to discover which transaction types and event types are available for generating correspondence.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transactionType: z
        .string()
        .optional()
        .describe(
          'If provided, returns event types for this specific transaction type instead of listing all transaction types'
        )
    })
  )
  .output(
    z.object({
      transactionTypes: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of available transaction types'),
      eventTypes: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of event types for the specified transaction type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpondyrClient({
      token: ctx.auth.token,
      applicationToken: ctx.auth.applicationToken
    });

    if (ctx.input.transactionType) {
      let eventTypes = await client.listEventTypes(ctx.input.transactionType);
      return {
        output: {
          transactionTypes: undefined,
          eventTypes: eventTypes as Record<string, unknown>[]
        },
        message: `Found **${eventTypes.length}** event type(s) for transaction type **${ctx.input.transactionType}**.`
      };
    }

    let transactionTypes = await client.listTransactionTypes();
    return {
      output: {
        transactionTypes: transactionTypes as Record<string, unknown>[],
        eventTypes: undefined
      },
      message: `Found **${transactionTypes.length}** transaction type(s).`
    };
  })
  .build();
