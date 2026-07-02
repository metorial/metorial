import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

let challengeOutputSchema = z.object({
  challengeId: z.string().describe('Challenge ID'),
  name: z.string().optional().describe('Challenge name'),
  shortName: z.string().optional().describe('Challenge short name'),
  description: z.string().optional().describe('Challenge description'),
  groupId: z.string().optional().describe('Group ID the challenge belongs to'),
  groupName: z.string().optional().describe('Group name'),
  leader: z.string().optional().describe('Leader user ID'),
  memberCount: z.number().optional().describe('Number of participants'),
  prize: z.number().optional().describe('Gem prize amount'),
  createdAt: z.string().optional().describe('When the challenge was created'),
  updatedAt: z.string().optional().describe('When the challenge was last updated')
});

export let manageChallenge = SlateTool.create(spec, {
  name: 'Manage Challenge',
  key: 'manage_challenge',
  description: `List, get, create, update, delete, join, or leave challenges in Habitica. Challenges are community-driven task sets where participants compete or collaborate within guilds or parties.`,
  instructions: [
    'Use action "list" to see challenges available to the user.',
    'Use action "join" or "leave" with a challengeId to participate.',
    'Creating a challenge requires a groupId and a name.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'join', 'leave'])
        .describe('Action to perform'),
      challengeId: z
        .string()
        .optional()
        .describe('Challenge ID (required for get, update, delete, join, leave)'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID for creating a challenge or listing group challenges'),
      name: z.string().optional().describe('Challenge name (for create/update)'),
      shortName: z.string().optional().describe('Short name (for create/update)'),
      description: z.string().optional().describe('Challenge description (for create/update)'),
      prize: z.number().optional().describe('Gem prize for the challenge (for create/update)'),
      keepTasks: z
        .enum(['keep-all', 'remove-all'])
        .optional()
        .describe('What to do with challenge tasks when leaving')
    })
  )
  .output(
    z.object({
      challenges: z.array(challengeOutputSchema).describe('Challenge(s) returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let mapChallenge = (c: Record<string, any>) => ({
      challengeId: c.id || c._id,
      name: c.name,
      shortName: c.shortName,
      description: c.description,
      groupId: typeof c.group === 'object' ? c.group?._id : c.group,
      groupName: typeof c.group === 'object' ? c.group?.name : undefined,
      leader: typeof c.leader === 'object' ? c.leader?._id : c.leader,
      memberCount: c.memberCount,
      prize: c.prize,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    });

    if (ctx.input.action === 'list') {
      let challenges = ctx.input.groupId
        ? await client.getGroupChallenges(ctx.input.groupId)
        : await client.getChallenges();
      return {
        output: { challenges: challenges.map(mapChallenge) },
        message: `Retrieved **${challenges.length}** challenge(s)`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.challengeId) throw new Error('challengeId is required for get action');
      let challenge = await client.getChallenge(ctx.input.challengeId);
      return {
        output: { challenges: [mapChallenge(challenge)] },
        message: `Retrieved challenge **${challenge.name}**`
      };
    }

    if (ctx.input.action === 'create') {
      let challengeData: Record<string, any> = {};
      if (ctx.input.groupId) challengeData.group = ctx.input.groupId;
      if (ctx.input.name) challengeData.name = ctx.input.name;
      if (ctx.input.shortName) challengeData.shortName = ctx.input.shortName;
      if (ctx.input.description) challengeData.description = ctx.input.description;
      if (ctx.input.prize !== undefined) challengeData.prize = ctx.input.prize;

      let challenge = await client.createChallenge(challengeData);
      return {
        output: { challenges: [mapChallenge(challenge)] },
        message: `Created challenge **${challenge.name}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.challengeId) throw new Error('challengeId is required for update action');
      let challengeData: Record<string, any> = {};
      if (ctx.input.name) challengeData.name = ctx.input.name;
      if (ctx.input.shortName) challengeData.shortName = ctx.input.shortName;
      if (ctx.input.description) challengeData.description = ctx.input.description;
      if (ctx.input.prize !== undefined) challengeData.prize = ctx.input.prize;

      let challenge = await client.updateChallenge(ctx.input.challengeId, challengeData);
      return {
        output: { challenges: [mapChallenge(challenge)] },
        message: `Updated challenge **${challenge.name}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.challengeId) throw new Error('challengeId is required for delete action');
      await client.deleteChallenge(ctx.input.challengeId);
      return {
        output: { challenges: [] },
        message: `Deleted challenge **${ctx.input.challengeId}**`
      };
    }

    if (ctx.input.action === 'join') {
      if (!ctx.input.challengeId) throw new Error('challengeId is required for join action');
      let challenge = await client.joinChallenge(ctx.input.challengeId);
      return {
        output: { challenges: [mapChallenge(challenge)] },
        message: `Joined challenge **${challenge.name}**`
      };
    }

    if (ctx.input.action === 'leave') {
      if (!ctx.input.challengeId) throw new Error('challengeId is required for leave action');
      await client.leaveChallenge(ctx.input.challengeId, ctx.input.keepTasks);
      return {
        output: { challenges: [] },
        message: `Left challenge **${ctx.input.challengeId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
