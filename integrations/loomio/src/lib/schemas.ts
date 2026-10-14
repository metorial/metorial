import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let groupIdSchema = z
  .number()
  .describe('Group ID. Call list_groups to discover your group IDs.');

export let discussionSchema = z.object({
  id: z.number(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  description_format: z.string().nullish(),
  group_id: z.number().nullish(),
  topic_id: z.number().nullish(),
  author_id: z.number().nullish(),
  created_at: z.string().nullish(),
  last_activity_at: z.string().nullish(),
  items_count: z.number().nullish(),
  closed_at: z.string().nullish()
});

export let pollSchema = z.object({
  id: z.number(),
  key: z.string(),
  title: z.string(),
  poll_type: z.string(),
  details: z.string().nullish(),
  details_format: z.string().nullish(),
  group_id: z.number().nullish(),
  discussion_id: z.number().nullish(),
  topic_id: z.number().nullish(),
  author_id: z.number().nullish(),
  closing_at: z.string().nullish(),
  closed_at: z.string().nullish(),
  created_at: z.string().nullish(),
  anonymous: z.boolean().nullish(),
  voters_count: z.number().nullish(),
  undecided_voters_count: z.number().nullish(),
  undecided_count: z.number().nullish(),
  poll_option_names: z.array(z.string()).nullish()
});

let metaSchema = z.object({ total: z.number().optional() }).optional();
export let discussionsResponseSchema = z.object({
  discussions: z.array(discussionSchema),
  meta: metaSchema
});
export let pollsResponseSchema = z.object({ polls: z.array(pollSchema), meta: metaSchema });
export let groupsResponseSchema = z.object({
  groups: z.array(
    z.object({
      id: z.number(),
      key: z.string(),
      name: z.string(),
      handle: z.string().nullish(),
      full_name: z.string().nullish(),
      parent_id: z.number().nullish(),
      enabled: z.boolean().nullish(),
      memberships_count: z.number().nullish()
    })
  )
});
export let commentsResponseSchema = z.object({
  comments: z.array(
    z.object({
      id: z.number(),
      discussion_id: z.number().nullish(),
      body: z.string().nullish(),
      body_format: z.string().nullish(),
      author_id: z.number().nullish(),
      created_at: z.string().nullish()
    })
  )
});
export let membershipsResultSchema = z.object({
  added_emails: z.array(z.string()),
  removed_emails: z.array(z.string())
});

export let parseLoomioResponse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError('Loomio returned an unexpected response format.');
  }
  return result.data;
};
