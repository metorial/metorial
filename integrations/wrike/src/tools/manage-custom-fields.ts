import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `List custom fields defined in the Wrike account. Custom fields can be applied to tasks, folders, and projects for structured data. Useful for getting custom field IDs needed when creating or updating tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customFieldIds: z
        .array(z.string())
        .optional()
        .describe('Specific custom field IDs to retrieve')
    })
  )
  .output(
    z.object({
      customFields: z.array(
        z.object({
          customFieldId: z.string(),
          title: z.string(),
          type: z.string(),
          accountId: z.string(),
          spaceId: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getCustomFields({
      customFieldIds: ctx.input.customFieldIds
    });

    let customFields = result.data.map(cf => ({
      customFieldId: cf.id,
      title: cf.title,
      type: cf.type,
      accountId: cf.accountId,
      spaceId: cf.spaceId
    }));

    return {
      output: { customFields, count: customFields.length },
      message: `Found **${customFields.length}** custom field(s).`
    };
  })
  .build();

export let createCustomField = SlateTool.create(spec, {
  name: 'Create Custom Field',
  key: 'create_custom_field',
  description: `Create a new custom field in the Wrike account. Custom fields extend tasks, folders, and projects with additional structured data. Supported types include Text, Numeric, Currency, Percentage, Date, Duration, Checkbox, DropDown, and MultiSelect.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Custom field title'),
      type: z
        .string()
        .describe(
          'Field type: Text, Numeric, Currency, Percentage, Date, Duration, Checkbox, DropDown, MultiSelect'
        ),
      spaceId: z
        .string()
        .optional()
        .describe('Space ID to scope the field to (optional, defaults to account-level)')
    })
  )
  .output(
    z.object({
      customFieldId: z.string(),
      title: z.string(),
      type: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let field = await client.createCustomField({
      title: ctx.input.title,
      type: ctx.input.type,
      spaceId: ctx.input.spaceId
    });

    return {
      output: {
        customFieldId: field.id,
        title: field.title,
        type: field.type
      },
      message: `Created custom field **${field.title}** (${field.id}) of type ${field.type}.`
    };
  })
  .build();
