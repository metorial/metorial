import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description:
    'Discover custom-field definitions applicable to contacts, accounts, or leads through the current REST API. Existing CRM tools use field names as keys, rather than REST field IDs. Lead attribution identifiers are excluded.',
  tags: { readOnly: true }
})
  .input(z.object({ entityType: z.enum(['Contacts', 'Accounts', 'Leads']) }))
  .output(
    z.object({
      entityType: z.string(),
      fields: z.array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          title: z.string().optional(),
          type: z.string().optional(),
          isMultiple: z.boolean().optional(),
          choices: z.array(z.string()).optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let fields = await new NutshellClient(ctx.auth).listCustomFields(ctx.input.entityType);
    return {
      output: { entityType: ctx.input.entityType, fields, count: fields.length },
      message: `Found ${fields.length} applicable custom field(s).`
    };
  })
  .build();
