import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPlaceholders = SlateTool.create(spec, {
  name: 'List Placeholders',
  key: 'list_placeholders',
  description: `Extracts all placeholder names from a DocsAutomator automation's template. Returns placeholders grouped into main document placeholders and line item groups. Useful for understanding what data a template expects before generating documents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      automationId: z.string().describe('The automation ID to list placeholders for.')
    })
  )
  .output(
    z.object({
      placeholders: z
        .record(z.string(), z.array(z.string()))
        .describe(
          'Placeholder names grouped by section. "main" contains top-level placeholders, "line_items_1", "line_items_2", etc. contain line item placeholders.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPlaceholders(ctx.input.automationId);

    let placeholders = result.placeholders || result;

    let mainCount = (placeholders.main || []).length;
    let lineItemGroups = Object.keys(placeholders).filter(k => k !== 'main');

    return {
      output: {
        placeholders
      },
      message: `Found **${mainCount}** main placeholder(s)${lineItemGroups.length > 0 ? ` and **${lineItemGroups.length}** line item group(s)` : ''}.`
    };
  })
  .build();
