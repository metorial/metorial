import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { amplitudeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let identifyUserTool = SlateTool.create(spec, {
  name: 'Identify User',
  key: 'identify_user',
  description: `Set or update user properties for a specific user without sending an event. Supports Amplitude's property operations like $set, $setOnce, $add, $append, $prepend, $unset, and $clearAll. Can also be used for group identification and user identity mapping (aliasing).`,
  instructions: [
    'Use property operations like {"$set": {"plan": "premium"}} for user properties to control how values are applied.',
    'For group identification, provide groupType and groupValue along with groupProperties.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('User ID to identify. At least one of userId or deviceId is required.'),
      deviceId: z.string().optional().describe('Device ID to identify.'),
      userProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'User properties to set. Supports operations like $set, $setOnce, $add, $append, $prepend, $unset, $clearAll.'
        ),
      groupType: z
        .string()
        .optional()
        .describe('Group type for group identification (e.g., "company", "team").'),
      groupValue: z
        .string()
        .optional()
        .describe('Group value for group identification (e.g., "Acme Corp").'),
      groupProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Group properties to set when using group identification.'),
      mapToGlobalUserId: z
        .string()
        .optional()
        .describe('Map this user to a global user ID for identity resolution/aliasing.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the identification was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let actions: string[] = [];

    if (ctx.input.userProperties && !ctx.input.userId && !ctx.input.deviceId) {
      throw amplitudeServiceError(
        'userId or deviceId is required when setting userProperties.'
      );
    }

    if (
      ctx.input.groupType !== undefined ||
      ctx.input.groupValue !== undefined ||
      ctx.input.groupProperties !== undefined
    ) {
      if (!ctx.input.groupType || !ctx.input.groupValue || !ctx.input.groupProperties) {
        throw amplitudeServiceError(
          'groupType, groupValue, and groupProperties are all required for group identification.'
        );
      }
    }

    if (ctx.input.mapToGlobalUserId && !ctx.input.userId) {
      throw amplitudeServiceError('userId is required when mapToGlobalUserId is provided.');
    }

    if (ctx.input.userProperties && (ctx.input.userId || ctx.input.deviceId)) {
      await client.identify({
        userId: ctx.input.userId,
        deviceId: ctx.input.deviceId,
        userProperties: ctx.input.userProperties
      });
      actions.push('user properties updated');
    }

    if (ctx.input.groupType && ctx.input.groupValue && ctx.input.groupProperties) {
      await client.groupIdentify(
        ctx.input.groupType,
        ctx.input.groupValue,
        ctx.input.groupProperties
      );
      actions.push(
        `group "${ctx.input.groupType}:${ctx.input.groupValue}" properties updated`
      );
    }

    if (ctx.input.mapToGlobalUserId && ctx.input.userId) {
      await client.mapUserIdentities({
        userId: ctx.input.userId,
        globalUserId: ctx.input.mapToGlobalUserId
      });
      actions.push(`user mapped to global ID "${ctx.input.mapToGlobalUserId}"`);
    }

    if (actions.length === 0) {
      throw amplitudeServiceError(
        'Provide userProperties, group identification fields, or mapToGlobalUserId.'
      );
    }

    return {
      output: { success: true },
      message: `Identification complete: ${actions.join(', ')}.`
    };
  })
  .build();
