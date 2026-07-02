import { SlateTool } from 'slates';
import { z } from 'zod';
import { HNClient } from '../lib/client';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve a Hacker News item by its unique ID. Items include stories, comments, jobs, Ask HN posts, polls, and poll options.
Returns the full item data including author, score, text content, URL, and child comment IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z.number().describe('Unique integer ID of the Hacker News item to retrieve')
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Unique identifier of the item'),
      type: z
        .string()
        .optional()
        .describe('Type of item: story, comment, job, poll, or pollopt'),
      author: z.string().optional().describe('Username of the author'),
      createdAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the item was created'),
      title: z.string().optional().describe('Title of the story, poll, or job'),
      text: z.string().optional().describe('HTML content of the item'),
      url: z.string().optional().describe('URL of the story'),
      score: z.number().optional().describe('Score/points of the item'),
      commentCount: z.number().optional().describe('Total number of comments on the item'),
      childIds: z.array(z.number()).optional().describe('IDs of direct child comments'),
      parentId: z.number().optional().describe('ID of the parent item (for comments)'),
      deleted: z.boolean().optional().describe('Whether the item has been deleted'),
      dead: z.boolean().optional().describe('Whether the item is dead/flagged')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HNClient();
    let item = await client.getItem(ctx.input.itemId);

    if (!item) {
      return {
        output: {
          itemId: ctx.input.itemId
        },
        message: `Item **${ctx.input.itemId}** was not found.`
      };
    }

    let createdAt = item.time ? new Date(item.time * 1000).toISOString() : undefined;

    let output = {
      itemId: item.id,
      type: item.type,
      author: item.by,
      createdAt,
      title: item.title,
      text: item.text,
      url: item.url,
      score: item.score,
      commentCount: item.descendants,
      childIds: item.kids,
      parentId: item.parent,
      deleted: item.deleted,
      dead: item.dead
    };

    let label = item.type === 'comment' ? 'Comment' : item.title || 'Item';
    return {
      output,
      message: `Retrieved ${item.type || 'item'} **${label}** (ID: ${item.id}) by ${item.by || 'unknown'}${item.score !== undefined ? ` with ${item.score} points` : ''}.`
    };
  })
  .build();
