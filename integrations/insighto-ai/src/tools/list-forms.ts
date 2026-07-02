import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieve a paginated list of forms, or get a specific form by ID. Can also list captured form submissions for a given form.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().optional().describe('Specific form ID to retrieve'),
      listCapturedResponses: z
        .boolean()
        .optional()
        .describe('List captured form responses for the specified form'),
      page: z.number().optional().describe('Page number (default 1)'),
      size: z.number().optional().describe('Items per page (default 50, max 100)')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string(),
            name: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional(),
      form: z
        .object({
          formId: z.string(),
          name: z.string().optional(),
          description: z.string().optional()
        })
        .optional(),
      capturedResponses: z.array(z.any()).optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.formId) {
      let result = await client.getForm(ctx.input.formId);
      let data = result.data || result;
      let capturedResponses: any[] | undefined;

      if (ctx.input.listCapturedResponses) {
        let capturedResult = await client.listCapturedForms(ctx.input.formId);
        capturedResponses = capturedResult.data || capturedResult;
      }

      return {
        output: {
          form: {
            formId: data.id,
            name: data.name,
            description: data.description
          },
          capturedResponses
        },
        message: `Retrieved form **${data.name || data.id}**${capturedResponses ? ` with ${Array.isArray(capturedResponses) ? capturedResponses.length : 0} captured response(s)` : ''}.`
      };
    }

    let result = await client.listForms({ page: ctx.input.page, size: ctx.input.size });
    let items = result.data || result.items || result;
    let list = Array.isArray(items) ? items : [];
    return {
      output: {
        forms: list.map((f: any) => ({
          formId: f.id,
          name: f.name,
          description: f.description
        })),
        totalCount: result.total || list.length
      },
      message: `Found **${list.length}** form(s).`
    };
  })
  .build();
