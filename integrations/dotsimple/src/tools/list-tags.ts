import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient, getCollection } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in the workspace. Returns tag names, UUIDs, and hex colors for content categorization.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({ workspaceId }))
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().optional().describe('Numeric ID of the tag'),
            tagUuid: z.string().optional().describe('UUID of the tag'),
            name: z.string().optional().describe('Tag name'),
            hexColor: z.string().optional().describe('Hex color code')
          })
        )
        .describe('Array of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });

    let result = await client.listTags();
    let tagList = getCollection(result).map((t: any) => ({
      tagId: t.id,
      tagUuid: t.uuid,
      name: t.name,
      hexColor: t.hex_color
    }));

    return {
      output: { tags: tagList },
      message: `Found **${tagList.length}** tag(s).`
    };
  })
  .build();
