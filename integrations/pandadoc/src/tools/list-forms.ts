import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all available forms in the PandaDoc workspace. Forms allow external recipients to fill out information that generates documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      count: z.number().optional().describe('Items per page')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string().describe('Form UUID'),
            formName: z.string().describe('Form name'),
            status: z.string().optional().describe('Form status'),
            dateCreated: z.string().optional().describe('ISO 8601 creation date'),
            dateModified: z.string().optional().describe('ISO 8601 last modified date')
          })
        )
        .describe('List of forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let params: any = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.count) params.count = ctx.input.count;

    let result = await client.listForms(params);

    let forms = (result.results || result || []).map((f: any) => ({
      formId: f.id,
      formName: f.name,
      status: f.status,
      dateCreated: f.date_created,
      dateModified: f.date_modified
    }));

    return {
      output: { forms },
      message: `Found **${forms.length}** form(s).`
    };
  })
  .build();
