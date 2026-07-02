import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let manageChannelPoints = SlateTool.create(spec, {
  name: 'Manage Channel Points',
  key: 'manage_channel_points',
  description: `Create, update, delete, and view custom Channel Points rewards. Also manage reward redemptions by fulfilling or canceling them.`,
  instructions: [
    'Use action "create" to create new rewards, "update" to modify, "delete" to remove, "get" to list rewards.',
    'Use action "get_redemptions" to view pending redemptions for a reward.',
    'Use action "update_redemption" to fulfill or cancel a redemption.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Broadcaster user ID'),
      action: z
        .enum(['create', 'update', 'delete', 'get', 'get_redemptions', 'update_redemption'])
        .describe('Action to perform'),
      rewardId: z
        .string()
        .optional()
        .describe('Reward ID (for update/delete/get_redemptions/update_redemption)'),
      title: z.string().optional().describe('Reward title'),
      cost: z.number().optional().describe('Reward cost in Channel Points'),
      prompt: z.string().optional().describe('Prompt shown to viewers when redeeming'),
      isEnabled: z.boolean().optional().describe('Whether the reward is enabled'),
      backgroundColor: z.string().optional().describe('Background color hex code'),
      isUserInputRequired: z.boolean().optional().describe('Whether user input is required'),
      isPaused: z.boolean().optional().describe('Whether the reward is paused (update only)'),
      maxPerStream: z
        .number()
        .optional()
        .describe('Max redemptions per stream (0 to disable)'),
      maxPerUserPerStream: z
        .number()
        .optional()
        .describe('Max per user per stream (0 to disable)'),
      globalCooldownSeconds: z
        .number()
        .optional()
        .describe('Global cooldown in seconds (0 to disable)'),
      skipRedemptionQueue: z
        .boolean()
        .optional()
        .describe('Auto-fulfill redemptions without queuing'),
      redemptionIds: z.array(z.string()).optional().describe('Redemption IDs to update'),
      redemptionStatus: z
        .enum(['FULFILLED', 'CANCELED'])
        .optional()
        .describe('New redemption status'),
      redemptionFilter: z
        .enum(['UNFULFILLED', 'FULFILLED', 'CANCELED'])
        .optional()
        .describe('Filter redemptions by status'),
      maxResults: z.number().optional().describe('Max results to return'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      reward: z
        .object({
          rewardId: z.string(),
          title: z.string(),
          cost: z.number(),
          isEnabled: z.boolean(),
          isPaused: z.boolean(),
          prompt: z.string(),
          backgroundColor: z.string()
        })
        .optional(),
      rewards: z
        .array(
          z.object({
            rewardId: z.string(),
            title: z.string(),
            cost: z.number(),
            isEnabled: z.boolean(),
            isPaused: z.boolean()
          })
        )
        .optional(),
      redemptions: z
        .array(
          z.object({
            redemptionId: z.string(),
            userId: z.string(),
            userName: z.string(),
            userInput: z.string(),
            status: z.string(),
            redeemedAt: z.string(),
            rewardTitle: z.string(),
            rewardCost: z.number()
          })
        )
        .optional(),
      cursor: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.title || ctx.input.cost === undefined) {
          throw new Error('title and cost are required to create a reward');
        }
        let reward = await client.createCustomReward(ctx.input.broadcasterId, {
          title: ctx.input.title,
          cost: ctx.input.cost,
          prompt: ctx.input.prompt,
          isEnabled: ctx.input.isEnabled,
          backgroundColor: ctx.input.backgroundColor,
          isUserInputRequired: ctx.input.isUserInputRequired,
          isMaxPerStreamEnabled:
            ctx.input.maxPerStream !== undefined && ctx.input.maxPerStream > 0,
          maxPerStream: ctx.input.maxPerStream,
          isMaxPerUserPerStreamEnabled:
            ctx.input.maxPerUserPerStream !== undefined && ctx.input.maxPerUserPerStream > 0,
          maxPerUserPerStream: ctx.input.maxPerUserPerStream,
          isGlobalCooldownEnabled:
            ctx.input.globalCooldownSeconds !== undefined &&
            ctx.input.globalCooldownSeconds > 0,
          globalCooldownSeconds: ctx.input.globalCooldownSeconds,
          shouldRedemptionsSkipRequestQueue: ctx.input.skipRedemptionQueue
        });

        return {
          output: {
            reward: {
              rewardId: reward.id,
              title: reward.title,
              cost: reward.cost,
              isEnabled: reward.is_enabled,
              isPaused: reward.is_paused,
              prompt: reward.prompt,
              backgroundColor: reward.background_color
            }
          },
          message: `Created reward: **${reward.title}** (${reward.cost} points)`
        };
      }

      case 'update': {
        if (!ctx.input.rewardId) throw new Error('rewardId is required for update');
        let reward = await client.updateCustomReward(
          ctx.input.broadcasterId,
          ctx.input.rewardId,
          {
            title: ctx.input.title,
            cost: ctx.input.cost,
            prompt: ctx.input.prompt,
            isEnabled: ctx.input.isEnabled,
            backgroundColor: ctx.input.backgroundColor,
            isUserInputRequired: ctx.input.isUserInputRequired,
            isPaused: ctx.input.isPaused,
            isMaxPerStreamEnabled:
              ctx.input.maxPerStream !== undefined ? ctx.input.maxPerStream > 0 : undefined,
            maxPerStream: ctx.input.maxPerStream,
            isMaxPerUserPerStreamEnabled:
              ctx.input.maxPerUserPerStream !== undefined
                ? ctx.input.maxPerUserPerStream > 0
                : undefined,
            maxPerUserPerStream: ctx.input.maxPerUserPerStream,
            isGlobalCooldownEnabled:
              ctx.input.globalCooldownSeconds !== undefined
                ? ctx.input.globalCooldownSeconds > 0
                : undefined,
            globalCooldownSeconds: ctx.input.globalCooldownSeconds,
            shouldRedemptionsSkipRequestQueue: ctx.input.skipRedemptionQueue
          }
        );

        return {
          output: {
            reward: {
              rewardId: reward.id,
              title: reward.title,
              cost: reward.cost,
              isEnabled: reward.is_enabled,
              isPaused: reward.is_paused,
              prompt: reward.prompt,
              backgroundColor: reward.background_color
            }
          },
          message: `Updated reward: **${reward.title}**`
        };
      }

      case 'delete': {
        if (!ctx.input.rewardId) throw new Error('rewardId is required for delete');
        await client.deleteCustomReward(ctx.input.broadcasterId, ctx.input.rewardId);
        return {
          output: { deleted: true },
          message: `Deleted reward \`${ctx.input.rewardId}\``
        };
      }

      case 'get': {
        let rewards = await client.getCustomRewards(ctx.input.broadcasterId, {
          rewardIds: ctx.input.rewardId ? [ctx.input.rewardId] : undefined
        });

        return {
          output: {
            rewards: rewards.map(r => ({
              rewardId: r.id,
              title: r.title,
              cost: r.cost,
              isEnabled: r.is_enabled,
              isPaused: r.is_paused
            }))
          },
          message: `Found **${rewards.length}** rewards`
        };
      }

      case 'get_redemptions': {
        if (!ctx.input.rewardId) throw new Error('rewardId is required for get_redemptions');
        let result = await client.getRedemptions(ctx.input.broadcasterId, ctx.input.rewardId, {
          status: ctx.input.redemptionFilter,
          first: ctx.input.maxResults,
          after: ctx.input.cursor
        });

        return {
          output: {
            redemptions: result.redemptions.map(r => ({
              redemptionId: r.id,
              userId: r.user_id,
              userName: r.user_name,
              userInput: r.user_input,
              status: r.status,
              redeemedAt: r.redeemed_at,
              rewardTitle: r.reward.title,
              rewardCost: r.reward.cost
            })),
            cursor: result.cursor
          },
          message: `Found **${result.redemptions.length}** redemptions`
        };
      }

      case 'update_redemption': {
        if (!ctx.input.rewardId || !ctx.input.redemptionIds || !ctx.input.redemptionStatus) {
          throw new Error('rewardId, redemptionIds, and redemptionStatus are required');
        }
        let redemptions = await client.updateRedemptionStatus(
          ctx.input.broadcasterId,
          ctx.input.rewardId,
          ctx.input.redemptionIds,
          ctx.input.redemptionStatus
        );

        return {
          output: {
            redemptions: redemptions.map(r => ({
              redemptionId: r.id,
              userId: r.user_id,
              userName: r.user_name,
              userInput: r.user_input,
              status: r.status,
              redeemedAt: r.redeemed_at,
              rewardTitle: r.reward.title,
              rewardCost: r.reward.cost
            }))
          },
          message: `Updated **${redemptions.length}** redemptions to ${ctx.input.redemptionStatus}`
        };
      }
    }
  })
  .build();
