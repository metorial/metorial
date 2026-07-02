import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageStateTool = SlateTool.create(spec, {
  name: 'Manage State',
  key: 'manage_state',
  description: `Get or set persistent state for a bot. State is a key-value store scoped to a conversation, user, bot, or workflow. Useful for maintaining context across interactions.`,
  instructions: [
    'Use stateType "conversation" with a conversationId, "user" with a userId, or "bot" with the botId as the resourceId.',
    'Use action "patch" to partially update an existing state without overwriting the entire payload.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'set', 'patch']).describe('Operation to perform'),
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      stateType: z
        .enum(['conversation', 'user', 'bot', 'workflow', 'integration', 'task'])
        .describe('Scope of the state'),
      resourceId: z
        .string()
        .describe(
          'ID of the resource (conversationId, userId, or botId depending on stateType)'
        ),
      stateName: z.string().describe('Name of the state as declared in the bot definition'),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('State data (required for set and patch)')
    })
  )
  .output(
    z.object({
      stateId: z.string().optional(),
      stateName: z.string(),
      stateType: z.string(),
      payload: z.record(z.string(), z.unknown()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new RuntimeClient({ token: ctx.auth.token, botId });

    if (ctx.input.action === 'get') {
      let result = await client.getState(
        ctx.input.stateType,
        ctx.input.resourceId,
        ctx.input.stateName
      );
      let s = result.state;
      return {
        output: {
          stateId: s.id,
          stateName: s.name,
          stateType: s.type,
          payload: s.payload,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        },
        message: `Retrieved state **${s.name}** (${s.type}) for resource **${ctx.input.resourceId}**.`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.payload) throw new Error('payload is required for set action');
      let result = await client.setState(
        ctx.input.stateType,
        ctx.input.resourceId,
        ctx.input.stateName,
        ctx.input.payload
      );
      let s = result.state;
      return {
        output: {
          stateId: s.id,
          stateName: s.name,
          stateType: s.type,
          payload: s.payload,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        },
        message: `Set state **${s.name}** (${s.type}) for resource **${ctx.input.resourceId}**.`
      };
    }

    if (ctx.input.action === 'patch') {
      if (!ctx.input.payload) throw new Error('payload is required for patch action');
      let result = await client.patchState(
        ctx.input.stateType,
        ctx.input.resourceId,
        ctx.input.stateName,
        ctx.input.payload
      );
      let s = result.state;
      return {
        output: {
          stateId: s.id,
          stateName: s.name,
          stateType: s.type,
          payload: s.payload,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        },
        message: `Patched state **${s.name}** (${s.type}) for resource **${ctx.input.resourceId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
