import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient, tagIdentifier } from '../lib/client';
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
      socialSetId: z
        .string()
        .describe('Social set ID. Call list_social_sets to discover accessible social sets.'),
      action: z
        .enum(['list', 'create'])
        .describe('Action to perform: "list" existing tags or "create" a new tag'),
      tagName: z
        .string()
        .optional()
        .describe(
          'Name of the tag to create (required when action is "create", 1-32 characters)'
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Tags per page when listing (default: 10).'),
      offset: z.number().min(0).optional().describe('Tags to skip when listing (default: 0).')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag identifier (the provider slug for current tags)'),
            tagName: z.string().describe('Name of the tag'),
            tagSlug: z
              .string()
              .optional()
              .describe('Actual provider slug for assigning this tag to drafts')
          })
        )
        .describe('List of tags (all tags when listing, or the newly created tag)'),
      created: z.boolean().describe('Whether a new tag was created'),
      totalCount: z.number().optional().describe('Total matching tags when listing'),
      limit: z.number().optional().describe('Page size when listing'),
      offset: z.number().optional().describe('Page offset when listing'),
      next: z.string().nullable().optional().describe('Next-page URL when listing'),
      previous: z.string().nullable().optional().describe('Previous-page URL when listing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      if (!ctx.input.tagName) {
        throw createApiServiceError('tagName is required when action is "create"');
      }

      if (ctx.input.tagName.length > 32) {
        throw createApiServiceError('tagName must contain at most 32 characters.');
      }

      let tag = await client.createTag(ctx.input.socialSetId, ctx.input.tagName);

      return {
        output: {
          tags: [{ tagId: tagIdentifier(tag), tagName: tag.name, tagSlug: tag.slug }],
          created: true
        },
        message: `Created tag **"${tag.name}"** (ID: \`${tagIdentifier(tag)}\`)`
      };
    }

    let result = await client.listTags(ctx.input.socialSetId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let tags = result.results.map(t => ({
      tagId: tagIdentifier(t),
      tagName: t.name,
      tagSlug: t.slug
    }));

    return {
      output: {
        tags,
        created: false,
        totalCount: result.count,
        limit: result.limit,
        offset: result.offset,
        next: result.next,
        previous: result.previous
      },
      message: `Found **${tags.length}** tag(s)${tags.length > 0 ? `: ${tags.map(t => `"${t.tagName}"`).join(', ')}` : ''}`
    };
  })
  .build();
