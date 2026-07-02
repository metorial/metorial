import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackClient } from '../lib/client';
import { customerIoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDevice = SlateTool.create(spec, {
  name: 'Manage Device',
  key: 'manage_device',
  description: `Register or remove a device for push notifications associated with a person. Use this to add mobile devices (iOS/Android) to a person for push notification targeting, or to remove a device when a user logs out or opts out.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personIdentifier: z
        .string()
        .describe('The unique identifier for the person who owns the device'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the device'),
      deviceToken: z.string().describe('The device token (push notification token)'),
      platform: z
        .enum(['ios', 'android'])
        .optional()
        .describe('The device platform. Required when adding a device.'),
      lastUsed: z
        .number()
        .optional()
        .describe('Unix timestamp of when the device was last used'),
      deviceAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom attributes for the device (e.g. device_os, app_version)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the device operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let trackClient = new TrackClient({
      siteId: ctx.auth.siteId,
      trackApiKey: ctx.auth.trackApiKey,
      region: ctx.config.region
    });

    if (ctx.input.action === 'add') {
      if (!ctx.input.platform) {
        throw customerIoServiceError('platform is required when adding a device.');
      }

      await trackClient.addDevice(ctx.input.personIdentifier, {
        id: ctx.input.deviceToken,
        platform: ctx.input.platform,
        last_used: ctx.input.lastUsed,
        attributes: ctx.input.deviceAttributes
      });
    } else {
      await trackClient.deleteDevice(ctx.input.personIdentifier, ctx.input.deviceToken);
    }

    return {
      output: { success: true },
      message:
        ctx.input.action === 'add'
          ? `Added device to person **${ctx.input.personIdentifier}**.`
          : `Removed device from person **${ctx.input.personIdentifier}**.`
    };
  })
  .build();
