import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormsiteClient } from '../lib/client';
import { spec } from '../spec';

let itemSchema: z.ZodType<any> = z.object({
  itemId: z.string().describe('Unique item/field identifier used to match with result values'),
  position: z.number().describe('Position/order of the item in the form'),
  label: z.string().describe('Display label for the item'),
  children: z
    .array(z.lazy(() => itemSchema))
    .optional()
    .describe('Child items for composite fields like Matrix or Multi Scale')
});

export let getFormItems = SlateTool.create(spec, {
  name: 'Get Form Items',
  key: 'get_form_items',
  description: `Retrieve field/item definitions for a specific form. Returns item IDs, labels, positions, and parent-child relationships for composite items. Use item IDs to label and interpret submission result data. Only items that store results are included; decorative items like headings and images are excluded.`,
  instructions: [
    'The formDir parameter can be found using the List Forms tool.',
    'Match item IDs from this response to item IDs in submission results to understand what each result value represents.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      formDir: z
        .string()
        .describe('Form directory identifier for the form to retrieve items from'),
      resultsLabels: z
        .string()
        .optional()
        .describe('Apply custom Results Labels to the item data')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of form items/field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormsiteClient({
      token: ctx.auth.token,
      server: ctx.config.server,
      userDir: ctx.config.userDir
    });

    let items = await client.getFormItems(ctx.input.formDir, ctx.input.resultsLabels);

    return {
      output: { items },
      message: `Retrieved **${items.length}** item(s) for form \`${ctx.input.formDir}\`.`
    };
  })
  .build();
