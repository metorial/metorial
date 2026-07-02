import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Creates a tag on a Miro board. Tags can be attached to cards and sticky notes for categorization. Each item can have up to 8 tags.`,
  instructions: [
    'Tag color options: red, light_green, cyan, yellow, dark_green, blue, violet, dark_blue, light_pink, orange, black, gray.',
    'Tags created via API require a board refresh to appear on the board.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      title: z.string().describe('Title of the tag'),
      fillColor: z
        .string()
        .optional()
        .describe('Color of the tag (e.g., "red", "blue", "yellow")')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('ID of the created tag'),
      title: z.string().describe('Title of the tag'),
      fillColor: z.string().optional().describe('Color of the tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let tag = await client.createTag(ctx.input.boardId, {
      title: ctx.input.title,
      fillColor: ctx.input.fillColor
    });

    return {
      output: {
        tagId: tag.id,
        title: tag.title,
        fillColor: tag.fillColor
      },
      message: `Created tag **${tag.title}** (ID: ${tag.id}) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let getTags = SlateTool.create(spec, {
  name: 'Get Tags',
  key: 'get_tags',
  description: `Retrieves tags from a Miro board. Can also retrieve tags attached to a specific item.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      itemId: z
        .string()
        .optional()
        .describe('If provided, retrieves tags attached to this specific item'),
      limit: z.number().optional().describe('Maximum number of tags to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            title: z.string().describe('Tag title'),
            fillColor: z.string().optional().describe('Tag color')
          })
        )
        .describe('List of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.itemId) {
      result = await client.getItemTags(ctx.input.boardId, ctx.input.itemId);
    } else {
      result = await client.getTags(ctx.input.boardId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    }

    let tagsList = result.data || result || [];
    if (!Array.isArray(tagsList)) tagsList = tagsList.data || [];

    let mappedTags = tagsList.map((tag: any) => ({
      tagId: tag.id,
      title: tag.title,
      fillColor: tag.fillColor
    }));

    return {
      output: { tags: mappedTags },
      message: `Found **${mappedTags.length}** tag(s)${ctx.input.itemId ? ` on item ${ctx.input.itemId}` : ` on board ${ctx.input.boardId}`}.`
    };
  })
  .build();

export let attachTag = SlateTool.create(spec, {
  name: 'Attach Tag',
  key: 'attach_tag',
  description: `Attaches a tag to a card or sticky note item on a Miro board. Items can have up to 8 tags. Tags and items must be on the same board.`,
  instructions: ['Tags created via the REST API require a board refresh to appear.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      itemId: z.string().describe('ID of the card or sticky note to attach the tag to'),
      tagId: z.string().describe('ID of the tag to attach')
    })
  )
  .output(
    z.object({
      attached: z.boolean().describe('Whether the tag was successfully attached')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.attachTag(ctx.input.boardId, ctx.input.itemId, ctx.input.tagId);

    return {
      output: { attached: true },
      message: `Attached tag ${ctx.input.tagId} to item ${ctx.input.itemId}.`
    };
  })
  .build();

export let detachTag = SlateTool.create(spec, {
  name: 'Detach Tag',
  key: 'detach_tag',
  description: `Removes a tag from a card or sticky note item on a Miro board.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      itemId: z.string().describe('ID of the item to remove the tag from'),
      tagId: z.string().describe('ID of the tag to remove')
    })
  )
  .output(
    z.object({
      detached: z.boolean().describe('Whether the tag was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.detachTag(ctx.input.boardId, ctx.input.itemId, ctx.input.tagId);

    return {
      output: { detached: true },
      message: `Removed tag ${ctx.input.tagId} from item ${ctx.input.itemId}.`
    };
  })
  .build();

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Deletes a tag from a Miro board. This removes the tag from all items it's attached to.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      tagId: z.string().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the tag was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.deleteTag(ctx.input.boardId, ctx.input.tagId);

    return {
      output: { deleted: true },
      message: `Deleted tag ${ctx.input.tagId} from board ${ctx.input.boardId}.`
    };
  })
  .build();
