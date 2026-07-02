import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all lead capture forms configured in the Drip account. Optionally fetch a specific form by its ID for detailed configuration info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z
        .string()
        .optional()
        .describe('If provided, fetches a specific form by ID instead of listing all forms.')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string(),
            name: z.string().optional(),
            headlineText: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .describe('List of forms.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.formId) {
      let result = await client.fetchForm(ctx.input.formId);
      let f = result.forms?.[0] ?? {};
      return {
        output: {
          forms: [
            {
              formId: f.id ?? '',
              name: f.name,
              headlineText: f.headline_text,
              createdAt: f.created_at
            }
          ]
        },
        message: `Fetched form **${f.name}**.`
      };
    }

    let result = await client.listForms();
    let forms = (result.forms ?? []).map((f: any) => ({
      formId: f.id ?? '',
      name: f.name,
      headlineText: f.headline_text,
      createdAt: f.created_at
    }));

    return {
      output: { forms },
      message: `Found **${forms.length}** forms.`
    };
  })
  .build();
