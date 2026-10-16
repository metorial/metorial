import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient, getCollection } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List reports available through the workspace reports API with pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId,
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      reports: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of report entries with account metrics'),
      currentPage: z.number().optional(),
      total: z.number().optional(),
      perPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });

    let result = await client.listReports(ctx.input.page);
    let reports = getCollection(result);

    return {
      output: {
        reports,
        currentPage: result?.meta?.current_page ?? result?.current_page,
        total: result?.meta?.total ?? result?.total,
        perPage: result?.meta?.per_page ?? result?.per_page
      },
      message: `Retrieved **${reports.length}** report(s) (page ${ctx.input.page}).`
    };
  })
  .build();
