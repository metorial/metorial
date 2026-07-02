import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let segmentSync = SlateTrigger.create(spec, {
  name: 'Segment Sync',
  key: 'segment_sync',
  description:
    'Receives webhook callbacks from Heap when users enter or exit a segment. Heap calls this endpoint every 4 hours with segment membership changes.',
  instructions: [
    'Configure the webhook URL in your Heap Segment Sync settings.',
    'The webhook payload includes users who entered or exited the segment since the last callback.',
    'Validate authenticity using the Heap-Hash header if your integration requires it.'
  ]
})
  .input(
    z.object({
      segmentName: z.string().optional().describe('Name of the Heap segment.'),
      action: z
        .enum(['entered', 'exited', 'unknown'])
        .describe('Whether the user entered or exited the segment.'),
      userIdentity: z
        .string()
        .optional()
        .describe('User identity value from the webhook payload.'),
      userId: z.string().optional().describe('Heap user ID from the webhook payload.'),
      rawPayload: z.any().describe('Raw webhook payload from Heap.')
    })
  )
  .output(
    z.object({
      segmentName: z.string().optional().describe('Name of the Heap segment.'),
      action: z.string().describe('Whether the user entered or exited the segment.'),
      userIdentity: z.string().optional().describe('User identity value.'),
      userId: z.string().optional().describe('Heap user ID.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;

      try {
        body = await ctx.request.json();
      } catch {
        ctx.warn('Failed to parse webhook body as JSON');
        return { inputs: [] };
      }

      // Heap segment sync webhooks can contain arrays of users who entered/exited
      let inputs: Array<{
        segmentName?: string;
        action: 'entered' | 'exited' | 'unknown';
        userIdentity?: string;
        userId?: string;
        rawPayload: unknown;
      }> = [];

      let segmentName = body.segment_name || body.segmentName || body.name;

      // Handle entered users
      let enteredUsers = body.entered || body.users_entered || [];
      for (let user of enteredUsers) {
        inputs.push({
          segmentName,
          action: 'entered',
          userIdentity: typeof user === 'string' ? user : user.identity || user.user_identity,
          userId: typeof user === 'string' ? undefined : user.user_id || user.userId,
          rawPayload: user
        });
      }

      // Handle exited users
      let exitedUsers = body.exited || body.users_exited || [];
      for (let user of exitedUsers) {
        inputs.push({
          segmentName,
          action: 'exited',
          userIdentity: typeof user === 'string' ? user : user.identity || user.user_identity,
          userId: typeof user === 'string' ? undefined : user.user_id || user.userId,
          rawPayload: user
        });
      }

      // If the payload doesn't match expected structure, treat it as a single event
      if (inputs.length === 0 && body) {
        inputs.push({
          segmentName,
          action: 'unknown',
          userIdentity: body.identity || body.user_identity,
          userId: body.user_id || body.userId,
          rawPayload: body
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let uniqueId = [
        ctx.input.segmentName || 'unknown_segment',
        ctx.input.action,
        ctx.input.userIdentity || ctx.input.userId || 'unknown_user',
        Date.now().toString()
      ].join('_');

      return {
        type: `segment.${ctx.input.action}`,
        id: uniqueId,
        output: {
          segmentName: ctx.input.segmentName,
          action: ctx.input.action,
          userIdentity: ctx.input.userIdentity,
          userId: ctx.input.userId
        }
      };
    }
  })
  .build();
