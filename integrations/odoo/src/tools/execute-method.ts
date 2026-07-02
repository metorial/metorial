import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let executeMethod = SlateTool.create(spec, {
  name: 'Execute Method',
  key: 'execute_method',
  description: `Call any public method on an Odoo model. Use this to trigger business logic such as confirming sales orders, validating invoices, sending emails, or running custom workflows.

Common examples:
- **sale.order** → \`action_confirm\` (confirm quotation)
- **account.move** → \`action_post\` (validate invoice)
- **stock.picking** → \`button_validate\` (validate transfer)
- **crm.lead** → \`action_set_won\` (mark as won)`,
  instructions: [
    'The recordIds are passed as the first positional argument to the method.',
    'Additional positional args and keyword args can be provided if the method requires them.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      model: z.string().describe('The Odoo model (e.g., "sale.order", "account.move")'),
      method: z
        .string()
        .describe('The method name to call (e.g., "action_confirm", "action_post")'),
      recordIds: z
        .array(z.number())
        .describe(
          'Record IDs to pass to the method. Pass an empty array if the method does not operate on specific records.'
        ),
      args: z
        .array(z.unknown())
        .optional()
        .describe('Additional positional arguments for the method'),
      kwargs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Keyword arguments for the method')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('The return value from the method call')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.callMethod(
      ctx.input.model,
      ctx.input.method,
      ctx.input.recordIds,
      ctx.input.args,
      ctx.input.kwargs
    );

    return {
      output: { result },
      message: `Executed \`${ctx.input.method}\` on \`${ctx.input.model}\` for ${ctx.input.recordIds.length} record(s).`
    };
  })
  .build();
