import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePresence = SlateTool.create(spec, {
  name: 'Update Presence',
  key: 'update_presence',
  description: `Updates the presence and availability status for a RingCentral user. Supports changing the user status (Available, Busy, Offline) and Do Not Disturb mode (TakeAllCalls, DoNotAcceptAnyCalls, DoNotAcceptDepartmentCalls, TakeDepartmentCallsOnly).`,
  instructions: [
    'Omit extensionId or pass "~" to update the current user\'s presence.',
    'Only include fields you want to change.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      extensionId: z
        .string()
        .optional()
        .describe('Extension ID of the user to update. Defaults to "~" (current user).'),
      userStatus: z
        .enum(['Offline', 'Busy', 'Available'])
        .optional()
        .describe('User availability status'),
      dndStatus: z
        .enum([
          'TakeAllCalls',
          'DoNotAcceptAnyCalls',
          'DoNotAcceptDepartmentCalls',
          'TakeDepartmentCallsOnly'
        ])
        .optional()
        .describe('Do Not Disturb status')
    })
  )
  .output(
    z.object({
      userStatus: z.string().describe('Current user availability status'),
      dndStatus: z.string().describe('Current Do Not Disturb status'),
      presenceStatus: z.string().describe('Aggregated presence status'),
      telephonyStatus: z.string().describe('Telephony status of the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let extensionId = ctx.input.extensionId || '~';

    let params: { dndStatus?: string; userStatus?: string } = {};
    if (ctx.input.userStatus !== undefined) params.userStatus = ctx.input.userStatus;
    if (ctx.input.dndStatus !== undefined) params.dndStatus = ctx.input.dndStatus;

    let result = await client.updatePresence(extensionId, params);

    let output = {
      userStatus: result.userStatus,
      dndStatus: result.dndStatus,
      presenceStatus: result.presenceStatus,
      telephonyStatus: result.telephonyStatus
    };

    let parts: string[] = [];
    if (ctx.input.userStatus) parts.push(`status to **${ctx.input.userStatus}**`);
    if (ctx.input.dndStatus) parts.push(`DND to **${ctx.input.dndStatus}**`);
    let summary = parts.length > 0 ? parts.join(' and ') : 'presence (no changes specified)';

    return {
      output,
      message: `Updated ${summary} for extension \`${extensionId}\`.`
    };
  })
  .build();
