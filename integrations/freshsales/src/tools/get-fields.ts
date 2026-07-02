import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getFields = SlateTool.create(spec, {
  name: 'Get Fields',
  key: 'get_fields',
  description: `Retrieve field metadata for an entity type in Freshsales. Returns all standard and custom fields with their types, labels, and configuration. Useful for discovering custom field keys.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['leads', 'contacts', 'deals', 'sales_accounts', 'sales_activities'])
        .describe('Entity type to get fields for')
    })
  )
  .output(
    z.object({
      fields: z.array(
        z.object({
          fieldId: z.number().optional(),
          name: z.string().nullable().optional(),
          label: z.string().nullable().optional(),
          type: z.string().nullable().optional(),
          required: z.boolean().nullable().optional(),
          choices: z.array(z.any()).nullable().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let fields = await client.getFields(ctx.input.entityType);

    let mapped = fields.map((f: Record<string, any>) => ({
      fieldId: f.id,
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
      choices: f.choices
    }));

    return {
      output: { fields: mapped },
      message: `Retrieved **${mapped.length}** fields for ${ctx.input.entityType}.`
    };
  })
  .build();
