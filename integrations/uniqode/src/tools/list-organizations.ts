import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  key: 'list_organizations',
  name: 'List Organizations',
  description:
    'Discover the organizations accessible with the current API key and their IDs for QR codes, cards, and analytics.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      page: z.number().int().positive().optional(),
      pageSize: z.number().int().positive().optional()
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .describe('Complete provider organization list, including IDs and pagination')
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new BeaconstacClient(ctx.auth).listOrganizations({
      page: ctx.input.page,
      page_size: ctx.input.pageSize
    });
    return {
      output: { raw },
      message: 'Retrieved the organizations accessible to this API key.'
    };
  })
  .build();
