import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageData = SlateTool.create(spec, {
  name: 'Manage Data',
  key: 'manage_data',
  description: `Create, update, or delete data entries in Dovetail. Data entries store structured research data like survey responses or feedback. Supports associating data with projects.`,
  instructions: [
    'To create data, provide projectId from list_projects and optionally a title or initial content.',
    'To update data, provide the dataId and the title to change.',
    'To delete data, provide the dataId and set action to "delete".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      dataId: z.string().optional().describe('Data ID (required for update and delete)'),
      title: z.string().optional().describe('Data entry title'),
      content: z.string().optional().describe('Data entry content'),
      projectId: projectIdSchema
        .optional()
        .describe('Project ID from list_projects (required for create).')
    })
  )
  .output(
    z.object({
      dataId: z.string(),
      title: z.string().optional(),
      createdAt: z.string().optional(),
      deleted: z.boolean().optional(),
      projectId: z.string().nullable().optional(),
      projectTitle: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectId)
        throw createApiServiceError(
          'projectId from list_projects is required to create data.'
        );
      let data = await client.createData({
        title: ctx.input.title,
        content: ctx.input.content,
        projectId: ctx.input.projectId
      });
      return {
        output: {
          dataId: data.id,
          title: data.title,
          createdAt: data.created_at,
          projectId: data.project?.id ?? null,
          projectTitle: data.project?.title ?? null
        },
        message: `Created data entry **${data.title || 'Untitled'}** (ID: ${data.id}).`
      };
    }

    if (!ctx.input.dataId) {
      throw createApiServiceError('dataId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      if (ctx.input.content !== undefined)
        throw createApiServiceError(
          'Dovetail cannot patch data content. Supply a title to update, or create data with initial content.'
        );
      if (ctx.input.title === undefined)
        throw createApiServiceError('Provide a title to update the data entry.');
      let data = await client.updateData(ctx.input.dataId, {
        title: ctx.input.title
      });
      return {
        output: {
          dataId: data.id,
          title: data.title
        },
        message: `Updated data entry **${data.title || ctx.input.dataId}**.`
      };
    }

    // delete
    let result = await client.deleteData(ctx.input.dataId);
    return {
      output: {
        dataId: result.id,
        title: result.title,
        deleted: true
      },
      message: `Deleted data entry **${result.title || ctx.input.dataId}**. It can be restored from trash within 30 days.`
    };
  })
  .build();
