import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdSchema, paging, pagingShape } from '../lib/schemas';
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
      accountId: accountIdSchema,
      page: z
        .number()
        .optional()
        .describe(
          'Legacy selector; this endpoint does not document pagination and returns the full form collection.'
        ),
      perPage: z
        .number()
        .optional()
        .describe('Legacy selector; this endpoint does not document a page size.'),
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
        .describe('List of forms.'),
      ...pagingShape
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId ?? ctx.config.accountId,
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
              headlineText: f.headline,
              createdAt: f.created_at
            }
          ]
        },
        message: 'Fetched the selected form.'
      };
    }

    let result = await client.listForms();
    let forms = (result.forms ?? []).map((f: any) => ({
      formId: f.id ?? '',
      name: f.name,
      headlineText: f.headline,
      createdAt: f.created_at
    }));

    return {
      output: { forms, ...paging(result) },
      message: `Found **${forms.length}** forms.`
    };
  })
  .build();
