import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteResource = SlateTool.create(spec, {
  name: 'Delete Page or Report',
  key: 'delete_resource',
  description: `Deletes a GTmetrix page or report. Deleting a page also removes all its associated reports. This action is permanent and cannot be undone.`,
  constraints: ['Viewer role accounts on Team plans cannot delete pages or reports.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pageId: z
        .string()
        .optional()
        .describe(
          'Page ID to delete. Deleting a page removes all associated reports. Provide either pageId or reportId.'
        ),
      reportId: z
        .string()
        .optional()
        .describe('Report ID to delete. Provide either pageId or reportId.')
    })
  )
  .output(
    z.object({
      deletedType: z
        .enum(['page', 'report'])
        .describe('The type of resource that was deleted'),
      deletedId: z.string().describe('The ID of the deleted resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.pageId && !ctx.input.reportId) {
      throw new Error('Either pageId or reportId must be provided');
    }

    if (ctx.input.pageId) {
      await client.deletePage(ctx.input.pageId);
      return {
        output: { deletedType: 'page' as const, deletedId: ctx.input.pageId },
        message: `Page **${ctx.input.pageId}** and all its reports have been permanently deleted.`
      };
    }

    await client.deleteReport(ctx.input.reportId!);
    return {
      output: { deletedType: 'report' as const, deletedId: ctx.input.reportId! },
      message: `Report **${ctx.input.reportId}** has been permanently deleted.`
    };
  })
  .build();
