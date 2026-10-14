import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let tagOutputSchema = z.object({
  tagId: z.string(),
  name: z.string(),
  archived: z.boolean()
});

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag in the Clockify workspace. Tags are used to categorize and filter time entries. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      name: z.string().describe('Tag name')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let tag = await client.createTag({ name: ctx.input.name });

    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        archived: tag.archived ?? false
      },
      message: `Created tag **${tag.name}**.`
    };
  })
  .build();

export let updateTag = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Update an existing tag in Clockify. Modify its name or archive status. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      tagId: z.string().describe('ID of the tag to update'),
      name: z.string().optional().describe('Updated tag name'),
      archived: z.boolean().optional().describe('Archive/unarchive the tag')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let tag = await client.updateTag(ctx.input.tagId, {
      name: ctx.input.name,
      archived: ctx.input.archived
    });

    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        archived: tag.archived ?? false
      },
      message: `Updated tag **${tag.name}**.`
    };
  })
  .build();

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a tag from the Clockify workspace. Call get_workspaces to discover the workspace ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      tagId: z.string().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    await client.deleteTag(ctx.input.tagId);

    return {
      output: { deleted: true },
      message: `Deleted tag **${ctx.input.tagId}**.`
    };
  })
  .build();

export let getTags = SlateTool.create(spec, {
  name: 'Get Tags',
  key: 'get_tags',
  description: `List tags in the Clockify workspace. Filter by name or archived status. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      name: z.string().optional().describe('Filter by tag name (partial match)'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      page: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .optional()
        .describe('Page number'),
      pageSize: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .optional()
        .describe('Entries per page')
    })
  )
  .output(
    z.object({
      tags: z.array(tagOutputSchema),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let results = await client.getTags({
      name: ctx.input.name,
      archived: ctx.input.archived,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (results as any[]).map((t: any) => ({
      tagId: t.id,
      name: t.name,
      archived: t.archived ?? false
    }));

    return {
      output: { tags: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** tags.`
    };
  })
  .build();
