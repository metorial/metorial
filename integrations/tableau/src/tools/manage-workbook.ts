import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { normalizeBoolean } from '../lib/normalizers';
import { spec } from '../spec';

export let manageWorkbook = SlateTool.create(spec, {
  name: 'Manage Workbook',
  key: 'manage_workbook',
  description: `Get details, update properties, delete, refresh extracts, or manage tags for a workbook. Use the **action** field to select the operation.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'update', 'delete', 'refresh', 'addTags', 'removeTags'])
        .describe('Operation to perform'),
      workbookId: z.string().describe('LUID of the workbook'),
      name: z.string().optional().describe('New name (for update)'),
      description: z.string().optional().describe('New description (for update)'),
      projectId: z
        .string()
        .optional()
        .describe('New project LUID to move workbook to (for update)'),
      ownerUserId: z.string().optional().describe('New owner user LUID (for update)'),
      showTabs: z.boolean().optional().describe('Whether to show tabs (for update)'),
      tags: z.array(z.string()).optional().describe('Tags to add or remove')
    })
  )
  .output(
    z.object({
      workbookId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      contentUrl: z.string().optional(),
      showTabs: z.boolean().optional(),
      projectId: z.string().optional(),
      projectName: z.string().optional(),
      ownerId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      jobId: z.string().optional(),
      deleted: z.boolean().optional(),
      connections: z.array(z.any()).optional(),
      views: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, workbookId } = ctx.input;

    if (action === 'get') {
      let wb = await client.getWorkbook(workbookId);
      let conns = await client.getWorkbookConnections(workbookId);
      let views = await client.queryViewsForWorkbook(workbookId);

      return {
        output: {
          workbookId: wb.id,
          name: wb.name,
          description: wb.description,
          contentUrl: wb.contentUrl,
          showTabs: normalizeBoolean(wb.showTabs),
          projectId: wb.project?.id,
          projectName: wb.project?.name,
          ownerId: wb.owner?.id,
          createdAt: wb.createdAt,
          updatedAt: wb.updatedAt,
          connections: conns.connections?.connection || [],
          views: (views.views?.view || []).map((v: any) => ({
            viewId: v.id,
            name: v.name,
            contentUrl: v.contentUrl
          }))
        },
        message: `Retrieved workbook **${wb.name}** with ${(conns.connections?.connection || []).length} connections and ${(views.views?.view || []).length} views.`
      };
    }

    if (action === 'update') {
      if (
        ctx.input.name === undefined &&
        ctx.input.description === undefined &&
        ctx.input.projectId === undefined &&
        ctx.input.ownerUserId === undefined &&
        ctx.input.showTabs === undefined
      ) {
        throw tableauServiceError('Provide at least one field to update a workbook.');
      }

      let wb = await client.updateWorkbook(workbookId, {
        name: ctx.input.name,
        description: ctx.input.description,
        projectId: ctx.input.projectId,
        ownerUserId: ctx.input.ownerUserId,
        showTabs: ctx.input.showTabs
      });

      return {
        output: {
          workbookId: wb.id,
          name: wb.name,
          description: wb.description,
          contentUrl: wb.contentUrl,
          showTabs: normalizeBoolean(wb.showTabs),
          projectId: wb.project?.id,
          projectName: wb.project?.name,
          ownerId: wb.owner?.id,
          updatedAt: wb.updatedAt
        },
        message: `Updated workbook **${wb.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteWorkbook(workbookId);
      return {
        output: { workbookId, deleted: true },
        message: `Deleted workbook \`${workbookId}\`.`
      };
    }

    if (action === 'refresh') {
      let job = await client.refreshWorkbook(workbookId);
      return {
        output: { workbookId, jobId: job?.id },
        message: `Triggered extract refresh for workbook \`${workbookId}\`. Job ID: \`${job?.id}\`.`
      };
    }

    if (action === 'addTags') {
      if (!ctx.input.tags?.length) {
        throw tableauServiceError('tags is required for addTags action.');
      }

      await client.addTagsToWorkbook(workbookId, ctx.input.tags);
      return {
        output: { workbookId },
        message: `Added tags [${ctx.input.tags.join(', ')}] to workbook \`${workbookId}\`.`
      };
    }

    if (action === 'removeTags') {
      if (!ctx.input.tags?.length) {
        throw tableauServiceError('tags is required for removeTags action.');
      }

      for (let tag of ctx.input.tags) {
        await client.deleteTagFromWorkbook(workbookId, tag);
      }
      return {
        output: { workbookId },
        message: `Removed tags [${ctx.input.tags.join(', ')}] from workbook \`${workbookId}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
