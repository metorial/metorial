import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let listAutoresponders = SlateTool.create(spec, {
  name: 'List Autoresponders',
  key: 'list_autoresponders',
  description: `List all autoresponders configured in the workspace. Browse through autoresponder configurations and their statuses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      autoresponders: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of autoresponder configurations'),
      currentPage: z.number().optional(),
      total: z.number().optional(),
      perPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listAutoresponders(ctx.input.page);
    let autoresponders = result?.data ?? (Array.isArray(result) ? result : []);

    return {
      output: {
        autoresponders,
        currentPage: result?.meta?.current_page ?? result?.current_page,
        total: result?.meta?.total ?? result?.total,
        perPage: result?.meta?.per_page ?? result?.per_page
      },
      message: `Retrieved **${autoresponders.length}** autoresponder(s) (page ${ctx.input.page}).`
    };
  })
  .build();
