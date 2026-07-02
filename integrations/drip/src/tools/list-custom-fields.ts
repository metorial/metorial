import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `List all custom field identifiers used across subscribers in the Drip account. Use this to discover available custom fields for segmentation and personalization.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customFields: z.array(z.string()).describe('List of custom field identifiers.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.listCustomFields();
    let customFields = result.custom_field_identifiers ?? [];

    return {
      output: { customFields },
      message: `Found **${customFields.length}** custom fields.`
    };
  })
  .build();
