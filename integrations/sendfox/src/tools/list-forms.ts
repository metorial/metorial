import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieve a paginated list of subscription forms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.number().describe('Form ID'),
          name: z.string().optional().describe('Form name'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listForms(ctx.input.page);

    return {
      output: {
        forms: result.data.map((f: any) => ({
          formId: f.id,
          name: f.name,
          createdAt: f.created_at
        })),
        currentPage: result.current_page,
        lastPage: result.last_page,
        total: result.total
      },
      message: `Retrieved ${result.data.length} forms (page ${result.current_page} of ${result.last_page}, ${result.total} total).`
    };
  })
  .build();
