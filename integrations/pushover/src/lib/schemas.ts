import { z } from 'zod';

export let groupKeySchema = z
  .string()
  .describe('Group key. Call list_groups to discover owned groups.');

export let groupMemberSchema = z.object({
  userKey: z.string().describe('Pushover user key of the group member'),
  device: z.string().describe('Device restriction (empty if none)'),
  memo: z.string().describe('Free-text memo about the member'),
  disabled: z.boolean().describe('Whether the member is temporarily disabled'),
  name: z.string().optional().describe('Team member name when returned by Pushover'),
  email: z.string().optional().describe('Team member email when returned by Pushover')
});
