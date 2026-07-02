import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFormFields = SlateTool.create(spec, {
  name: 'List Form Fields',
  key: 'list_form_fields',
  description: `List all fields (questions) on a Paperform form. Returns each field's key, title, type, and configuration. Useful for understanding form structure or mapping submission data to field definitions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      search: z.string().optional().describe('Search fields by name'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      fields: z.array(
        z.object({
          fieldKey: z.string().describe('Unique field key identifier'),
          title: z.string().nullable().describe('Field display title'),
          description: z.string().nullable().describe('Field description'),
          type: z.string().describe('Field type (text, email, number, date, etc.)'),
          required: z.boolean().nullable().describe('Whether the field is required'),
          customKey: z.string().nullable().describe('Custom field key if set'),
          placeholder: z.string().nullable().describe('Input placeholder text')
        })
      ),
      total: z.number().describe('Total number of fields'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFormFields(ctx.input.formSlugOrId, {
      search: ctx.input.search,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let fields = result.results.map(f => ({
      fieldKey: f.key,
      title: f.title,
      description: f.description,
      type: f.type,
      required: f.required,
      customKey: f.custom_key,
      placeholder: f.placeholder
    }));

    return {
      output: {
        fields,
        total: result.total,
        hasMore: result.has_more
      },
      message: `Found **${result.total}** field(s). Returned **${fields.length}** result(s).`
    };
  })
  .build();
