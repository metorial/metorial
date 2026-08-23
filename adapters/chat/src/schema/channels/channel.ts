import { z } from 'zod';
import { chatContextSchema } from '../shared/context';
import { rawSchema } from '../shared/raw';

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
  providerType: z.string().optional(),
  name: z.string().optional(),
  topic: z.string().optional(),
  subject: z.string().optional(),
  context: chatContextSchema.optional(),
  permalink: z.string().optional(),
  memberCount: z.number().optional(),
  raw: rawSchema
});

export type Channel = z.infer<typeof channelSchema>;
