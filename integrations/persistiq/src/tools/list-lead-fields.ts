import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeadFields = SlateTool.create(spec, {
  name: 'List Lead Fields',
  key: 'list_lead_fields',
  description: `Retrieve all lead fields (including custom fields) configured for your PersistIQ account. Useful for understanding which fields are available when creating or updating leads.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            fieldId: z.string().optional().describe('Unique identifier for the field'),
            name: z.string().optional().nullable().describe('Display name of the field'),
            key: z.string().optional().nullable().describe('Field key used in the API')
          })
        )
        .describe('List of available lead fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listLeadFields();

    let fields = (result.lead_fields || result.fields || []).map((f: any) => ({
      fieldId: f.id,
      name: f.name,
      key: f.key || f.field_key
    }));

    return {
      output: { fields },
      message: `Retrieved **${fields.length}** lead fields.`
    };
  })
  .build();
