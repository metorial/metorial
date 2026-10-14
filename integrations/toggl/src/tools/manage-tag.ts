import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Create, update, or delete a tag in Toggl Track. Tags are used to label time entries for cross-project filtering and categorization.
To **create**: provide a name. To **update**: provide a tagId and a new name. To **delete**: provide a tagId and set \`delete\` to true.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdInput,
      tagId: z
        .string()
        .optional()
        .describe('Tag ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the tag'),
      name: z.string().optional().describe('Tag name (required for create and update)')
    })
  )
  .output(
    z.object({
      tag: z
        .object({
          tagId: z.number().describe('Tag ID'),
          name: z.string().describe('Tag name'),
          workspaceId: z.number().describe('Workspace ID')
        })
        .nullable()
        .describe('The created/updated tag, null if deleted'),
      deleted: z.boolean().describe('Whether a tag was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token, ctx.auth.defaultWorkspaceId);
    let wsId = await client.resolveWorkspaceId(ctx.input.workspaceId, ctx.config);

    if (ctx.input.delete && !ctx.input.tagId) {
      throw createApiServiceError('tagId is required when deleting.');
    }

    if (ctx.input.delete && ctx.input.tagId) {
      await client.deleteTag(wsId, ctx.input.tagId);
      return {
        output: { tag: null, deleted: true },
        message: `Deleted tag **#${ctx.input.tagId}**`
      };
    }

    let result: any;
    if (ctx.input.tagId) {
      if (!ctx.input.name)
        throw createApiServiceError('Tag name is required when updating a tag.');
      result = await client.updateTag(wsId, ctx.input.tagId, { name: ctx.input.name });
    } else {
      if (!ctx.input.name)
        throw createApiServiceError('Tag name is required when creating a tag.');
      result = await client.createTag(wsId, { name: ctx.input.name });
    }

    let candidates: unknown[] = Array.isArray(result) ? result : [result];
    let tag = candidates.find(
      candidate =>
        isApiErrorRecord(candidate) &&
        (ctx.input.tagId
          ? String(candidate.id) === ctx.input.tagId
          : candidate.name === ctx.input.name)
    );
    if (
      !isApiErrorRecord(tag) ||
      typeof tag.id !== 'number' ||
      !Number.isSafeInteger(tag.id) ||
      tag.id <= 0 ||
      typeof tag.name !== 'string' ||
      !tag.name.trim()
    ) {
      throw createApiServiceError(
        'Toggl Track did not return the requested tag after saving it. Check list_tags before retrying.',
        { reason: 'invalid_tag_response' }
      );
    }
    let workspaceId = tag.workspace_id ?? tag.wid ?? Number(wsId);
    if (
      typeof workspaceId !== 'number' ||
      !Number.isSafeInteger(workspaceId) ||
      workspaceId <= 0
    ) {
      throw createApiServiceError(
        'Toggl Track returned an invalid workspace ID for the saved tag. Check list_tags before retrying.',
        { reason: 'invalid_tag_response' }
      );
    }

    return {
      output: {
        tag: {
          tagId: tag.id,
          name: tag.name,
          workspaceId
        },
        deleted: false
      },
      message: ctx.input.tagId
        ? `Updated tag to **${tag.name}**`
        : `Created tag **${tag.name}**`
    };
  })
  .build();
