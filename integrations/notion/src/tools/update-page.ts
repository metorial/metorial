import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let updatePage = SlateTool.create(spec, {
  name: 'Update Page',
  key: 'update_page',
  description: `Update an existing Notion page's properties, icon, cover, lock status, or archive status.
Use this for modifying page metadata and property values. To modify page content (blocks), use the block management tools instead.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to update'),
      properties: z.record(z.string(), z.any()).optional().describe('Updated page properties'),
      icon: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('New page icon, or null to remove'),
      cover: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('New page cover image, or null to remove'),
      archived: z
        .boolean()
        .optional()
        .describe('Set to true to archive the page, false to unarchive'),
      isLocked: z
        .boolean()
        .optional()
        .describe('Set to true to lock the page, false to unlock')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the updated page'),
      url: z.string().optional().describe('URL of the page'),
      lastEditedTime: z.string().optional().describe('Timestamp of the last edit'),
      archived: z.boolean().optional().describe('Current archive status'),
      isLocked: z.boolean().optional().describe('Current lock status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let page = await client.updatePage(ctx.input.pageId, {
      properties: ctx.input.properties,
      icon: ctx.input.icon,
      cover: ctx.input.cover,
      archived: ctx.input.archived,
      isLocked: ctx.input.isLocked
    });

    let changes: string[] = [];
    if (ctx.input.properties) changes.push('properties');
    if (ctx.input.icon !== undefined) changes.push('icon');
    if (ctx.input.cover !== undefined) changes.push('cover');
    if (ctx.input.archived !== undefined)
      changes.push(ctx.input.archived ? 'archived' : 'unarchived');
    if (ctx.input.isLocked !== undefined)
      changes.push(ctx.input.isLocked ? 'locked' : 'unlocked');

    return {
      output: {
        pageId: page.id,
        url: page.url,
        lastEditedTime: page.last_edited_time,
        archived: page.archived,
        isLocked: page.is_locked
      },
      message: `Updated page **${page.id}** — changed: ${changes.join(', ') || 'no changes'}`
    };
  })
  .build();
