import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags available in the helpdesk. Tags are used to categorize and organize tickets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of tags to return')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.number().describe('Tag ID'),
          name: z.string().describe('Tag name'),
          color: z.string().nullable().describe('Tag color')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listTags({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let tagList = result.data.map((t: any) => ({
      tagId: t.id,
      name: t.name,
      color: t.decoration?.color || null
    }));

    return {
      output: {
        tags: tagList,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${tagList.length}** tag(s).`
    };
  })
  .build();

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag for categorizing tickets. Optionally specify a color for visual identification.`
})
  .input(
    z.object({
      name: z.string().describe('Tag name'),
      color: z.string().optional().describe('Tag color (e.g., "#FF0000")')
    })
  )
  .output(
    z.object({
      tagId: z.number().describe('ID of the created tag'),
      name: z.string().describe('Tag name'),
      color: z.string().nullable().describe('Tag color')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: any = { name: ctx.input.name };
    if (ctx.input.color) {
      data.decoration = { color: ctx.input.color };
    }

    let tag = await client.createTag(data);

    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        color: tag.decoration?.color || null
      },
      message: `Created tag **"${tag.name}"** (ID: ${tag.id}).`
    };
  })
  .build();

export let updateTag = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Update an existing tag's name or color.`
})
  .input(
    z.object({
      tagId: z.number().describe('ID of the tag to update'),
      name: z.string().optional().describe('New tag name'),
      color: z.string().optional().describe('New tag color')
    })
  )
  .output(
    z.object({
      tagId: z.number().describe('Tag ID'),
      name: z.string().describe('Updated tag name'),
      color: z.string().nullable().describe('Updated tag color')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: any = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.color) data.decoration = { color: ctx.input.color };

    let tag = await client.updateTag(ctx.input.tagId, data);

    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        color: tag.decoration?.color || null
      },
      message: `Updated tag **"${tag.name}"** (ID: ${tag.id}).`
    };
  })
  .build();

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Permanently delete a tag. Tickets currently using this tag will have it removed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tagId: z.number().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the tag was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteTag(ctx.input.tagId);

    return {
      output: { deleted: true },
      message: `Deleted tag **#${ctx.input.tagId}**.`
    };
  })
  .build();

export let manageTicketTags = SlateTool.create(spec, {
  name: 'Manage Ticket Tags',
  key: 'manage_ticket_tags',
  description: `Add, remove, or replace tags on a ticket. Use "add" to append tags, "remove" to remove specific tags, or "set" to replace all tags on the ticket.`
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket'),
      action: z
        .enum(['add', 'remove', 'set'])
        .describe('Action to perform: add, remove, or set (replace all)'),
      tagNames: z.array(z.string()).describe('Tag names to add, remove, or set')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('Ticket ID'),
      action: z.string().describe('Action performed'),
      tagNames: z.array(z.string()).describe('Tags involved in the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let tags = ctx.input.tagNames.map(name => ({ name }));

    if (ctx.input.action === 'add') {
      await client.addTicketTags(ctx.input.ticketId, tags);
    } else if (ctx.input.action === 'remove') {
      await client.removeTicketTags(ctx.input.ticketId, tags);
    } else {
      await client.setTicketTags(ctx.input.ticketId, tags);
    }

    return {
      output: {
        ticketId: ctx.input.ticketId,
        action: ctx.input.action,
        tagNames: ctx.input.tagNames
      },
      message: `${ctx.input.action === 'add' ? 'Added' : ctx.input.action === 'remove' ? 'Removed' : 'Set'} **${ctx.input.tagNames.length}** tag(s) on ticket **#${ctx.input.ticketId}**: ${ctx.input.tagNames.join(', ')}.`
    };
  })
  .build();
