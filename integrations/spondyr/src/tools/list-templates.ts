import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description:
    'List templates configured for a transaction type, including their event type, content type, recipients, conditions, and search filters. Call list_transaction_types to discover transaction type names.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      transactionType: z
        .string()
        .describe('Transaction type name discovered with list_transaction_types')
    })
  )
  .output(
    z.object({
      templates: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Template definitions with names and delivery configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpondyrClient(ctx.auth);
    let templates = await client.listTemplates(ctx.input.transactionType);
    return {
      output: { templates },
      message: `Found **${templates.length}** template(s) for transaction type **${ctx.input.transactionType}**.`
    };
  })
  .build();
