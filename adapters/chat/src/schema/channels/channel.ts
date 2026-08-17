import { z } from 'zod';

export let channelTypeSchema = z.enum([
  'public',
  'private',
  'dm',
  'group_dm',
  'shared',
  'announcement',
  'forum',
  'unknown'
]);

export type ChannelType = z.infer<typeof channelTypeSchema>;

export let channelSchema = z.object({
  id: z.string(),
  workspaceId: z.string().optional(),
  type: channelTypeSchema,
  name: z.string().optional(),
  topic: z.string().optional(),
  memberCount: z.number().optional()
});

export type Channel = z.infer<typeof channelSchema>;
