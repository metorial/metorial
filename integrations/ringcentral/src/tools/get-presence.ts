import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPresence = SlateTool.create(spec, {
  name: 'Get Presence',
  key: 'get_presence',
  description: `Retrieve a user's presence and availability status in RingCentral. Returns the user's current status, do-not-disturb setting, presence, and telephony state. Omit extensionId to get the authenticated user's presence.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      extensionId: z
        .string()
        .optional()
        .describe("Extension ID to look up. Omit to get the authenticated user's presence.")
    })
  )
  .output(
    z.object({
      userStatus: z
        .string()
        .describe('User-defined availability status (e.g. Available, Busy, Offline)'),
      dndStatus: z
        .string()
        .describe(
          'Do-not-disturb status (e.g. TakeAllCalls, DoNotAcceptAnyCalls, DoNotAcceptDepartmentCalls, TakeDepartmentCallsOnly)'
        ),
      presenceStatus: z
        .string()
        .describe('Aggregated presence status (e.g. Available, Busy, Offline)'),
      telephonyStatus: z
        .string()
        .describe('Telephony line status (e.g. NoCall, Ringing, CallConnected, OnHold)'),
      message: z.string().optional().describe('Custom user presence status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let extensionId = ctx.input.extensionId || '~';
    let presence = await client.getPresence(extensionId);

    return {
      output: {
        userStatus: presence.userStatus,
        dndStatus: presence.dndStatus,
        presenceStatus: presence.presenceStatus,
        telephonyStatus: presence.telephonyStatus,
        message: presence.message
      },
      message: `Presence for extension \`${extensionId}\`: **${presence.userStatus}** (DND: ${presence.dndStatus}, Telephony: ${presence.telephonyStatus}).`
    };
  })
  .build();
