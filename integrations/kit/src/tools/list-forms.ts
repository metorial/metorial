import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List sign-up forms and landing pages in your Kit account. Filter by type (embed, hosted, modal) and status (active, archived, trashed, all).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['embed', 'hosted', 'modal']).optional().describe('Filter by form type'),
      status: z
        .enum(['active', 'archived', 'trashed', 'all'])
        .optional()
        .describe('Filter by form status')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.number().describe('Unique form ID'),
          name: z.string().describe('Form name'),
          type: z.string().describe('Form type (embed, hosted, modal)'),
          format: z.string().describe('Form format'),
          archived: z.boolean().describe('Whether the form is archived'),
          createdAt: z.string().describe('When the form was created')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listForms({
      type: ctx.input.type,
      status: ctx.input.status
    });

    let forms = result.data.map(f => ({
      formId: f.id,
      name: f.name,
      type: f.type,
      format: f.format,
      archived: f.archived,
      createdAt: f.created_at
    }));

    return {
      output: { forms },
      message: `Found **${forms.length}** forms.`
    };
  })
  .build();
