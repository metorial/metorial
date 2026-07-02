import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags or a specific tag by ID from your Simplero account. Useful for discovering available tag names and IDs for use with the Tag Contact tool.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tagId: z
        .string()
        .optional()
        .describe('Specific tag ID to retrieve. Omit to list all tags.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      tag: z.record(z.string(), z.unknown()).optional().describe('Single tag record'),
      availableTags: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of tag records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    if (ctx.input.tagId) {
      let tag = await client.getTag(ctx.input.tagId);
      return {
        output: { tag },
        message: `Retrieved tag **${tag.name}** (ID: ${tag.id}).`
      };
    }

    let availableTags = await client.listTags({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    return {
      output: { availableTags },
      message: `Found **${availableTags.length}** tag(s).`
    };
  })
  .build();
