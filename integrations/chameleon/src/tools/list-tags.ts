import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  tagId: z.string().describe('Chameleon tag ID'),
  uid: z.string().optional().describe('Normalized tag name or external ID'),
  name: z.string().optional().describe('Original tag text'),
  description: z.string().optional().describe('Tag description'),
  modelsCount: z.number().optional().describe('Number of attached experiences'),
  disabledAt: z.string().nullable().optional().describe('Disablement timestamp'),
  lastSeenAt: z.string().nullable().optional().describe('Last add/remove activity'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapTag = (t: Record<string, unknown>) => ({
  tagId: t.id as string,
  uid: t.uid as string | undefined,
  name: t.name as string | undefined,
  description: t.description as string | undefined,
  modelsCount: t.models_count as number | undefined,
  disabledAt: t.disabled_at as string | null | undefined,
  lastSeenAt: t.last_seen_at as string | null | undefined,
  createdAt: t.created_at as string | undefined,
  updatedAt: t.updated_at as string | undefined
});

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in your Chameleon account, or retrieve a specific tag by ID.
Tags are used to group and categorize experiences (e.g., "Upsell", "Feature", "Onboarding").`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tagId: z.string().optional().describe('Chameleon tag ID to retrieve a specific tag'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of tags to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items')
    })
  )
  .output(
    z.object({
      tag: tagSchema.optional().describe('Single tag (when fetching by ID)'),
      tagsList: z.array(tagSchema).optional().describe('Array of tags'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.tagId) {
      let result = await client.getTag(ctx.input.tagId);
      return {
        output: { tag: mapTag(result) },
        message: `Retrieved tag **${result.name || result.id}**.`
      };
    }

    let result = await client.listTags({
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let tagsList = (result.tags || []).map(mapTag);
    return {
      output: { tagsList, cursor: result.cursor },
      message: `Returned **${tagsList.length}** tags.`
    };
  })
  .build();
