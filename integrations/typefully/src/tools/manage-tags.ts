import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List existing tags or create a new tag for a social set. Tags are used to organize and categorize drafts for better workflow management.`,
  instructions: [
    'Set action to "list" to retrieve all existing tags, or "create" to create a new tag.',
    'When creating, provide the tagName for the new tag.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      socialSetId: z.string().describe('ID of the social set'),
      action: z
        .enum(['list', 'create'])
        .describe('Action to perform: "list" existing tags or "create" a new tag'),
      tagName: z
        .string()
        .optional()
        .describe('Name of the tag to create (required when action is "create")')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('ID of the tag'),
            tagName: z.string().describe('Name of the tag')
          })
        )
        .describe('List of tags (all tags when listing, or the newly created tag)'),
      created: z.boolean().describe('Whether a new tag was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      if (!ctx.input.tagName) {
        throw new Error('tagName is required when action is "create"');
      }

      let tag = await client.createTag(ctx.input.socialSetId, ctx.input.tagName);

      return {
        output: {
          tags: [{ tagId: tag.id, tagName: tag.name }],
          created: true
        },
        message: `Created tag **"${tag.name}"** (ID: \`${tag.id}\`)`
      };
    }

    let result = await client.listTags(ctx.input.socialSetId);
    let tags = result.results.map(t => ({
      tagId: t.id,
      tagName: t.name
    }));

    return {
      output: {
        tags,
        created: false
      },
      message: `Found **${tags.length}** tag(s)${tags.length > 0 ? `: ${tags.map(t => `"${t.tagName}"`).join(', ')}` : ''}`
    };
  })
  .build();
