import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageClockTuneTool = SlateTool.create(spec, {
  name: 'Manage ClockTune Profiles',
  key: 'manage_clocktune',
  description: `List, create, update, or delete GPU overclocking (ClockTune) profiles. Profiles contain GPU clock, voltage, memory clock, fan, and power limit settings for AMD and NVIDIA GPUs. Use profiles to control GPU performance and thermal behavior across your mining fleet.`,
  instructions: [
    'For listing: optionally filter by profileId, profileName, or customerId.',
    'For creating: provide profileName and values (JSON string with overclocking settings).',
    'For updating: provide profileId and new values.',
    'For deleting: provide profileId.'
  ],
  constraints: ['Requires a Bearer token (private API)'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      profileId: z
        .number()
        .optional()
        .describe('ClockTune profile ID (for get/update/delete)'),
      profileName: z.string().optional().describe('Profile name (for create or filter)'),
      values: z
        .string()
        .optional()
        .describe(
          'JSON string with overclocking values (for create/update). Includes fan, core clock, core voltage, memory clock, power limit settings.'
        ),
      customerId: z
        .number()
        .optional()
        .describe(
          'Customer ID. If omitted, all accounts are queried (list) or main account is used (create).'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      response: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.token) {
      throw new Error(
        'Bearer token is required for ClockTune management. Use the "API Credentials" authentication method.'
      );
    }

    let client = new ManagementClient({ token: ctx.auth.token });
    let result: any;

    switch (ctx.input.action) {
      case 'list': {
        ctx.progress('Fetching ClockTune profiles...');
        result = await client.getClockTuneProfiles({
          user: ctx.input.customerId,
          id: ctx.input.profileId,
          name: ctx.input.profileName
        });
        break;
      }
      case 'create': {
        if (!ctx.input.profileName || !ctx.input.values) {
          throw new Error(
            'profileName and values are required to create a ClockTune profile.'
          );
        }
        ctx.progress(`Creating ClockTune profile ${ctx.input.profileName}...`);
        result = await client.createClockTuneProfile({
          name: ctx.input.profileName,
          values: ctx.input.values,
          user: ctx.input.customerId
        });
        break;
      }
      case 'update': {
        if (!ctx.input.profileId || !ctx.input.values) {
          throw new Error('profileId and values are required to update a ClockTune profile.');
        }
        ctx.progress(`Updating ClockTune profile ${ctx.input.profileId}...`);
        result = await client.updateClockTuneProfile({
          id: ctx.input.profileId,
          values: ctx.input.values,
          name: ctx.input.profileName
        });
        break;
      }
      case 'delete': {
        if (!ctx.input.profileId) {
          throw new Error('profileId is required to delete a ClockTune profile.');
        }
        ctx.progress(`Deleting ClockTune profile ${ctx.input.profileId}...`);
        result = await client.deleteClockTuneProfile({ id: ctx.input.profileId });
        break;
      }
    }

    return {
      output: {
        success: true,
        response: result
      },
      message: `ClockTune operation **${ctx.input.action}** completed successfully${ctx.input.profileName ? ` for profile **${ctx.input.profileName}**` : ctx.input.profileId ? ` for profile ID **${ctx.input.profileId}**` : ''}.`
    };
  })
  .build();
