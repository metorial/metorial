import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let deleteProfile = SlateTool.create(spec, {
  name: 'Delete User Profile',
  key: 'delete_profile',
  description: `Permanently delete or reset a Chameleon user profile.
Use **clear** mode to reset a profile (clears browser metrics, survey responses, events) while keeping the profile record.
Use **forget** mode to permanently remove all user data with no recovery (backup retained for 3 months).`,
  instructions: ['Provide exactly one of profileId, uid, or email to identify the user.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      profileId: z.string().optional().describe('Chameleon user profile ID'),
      uid: z.string().optional().describe('External user identifier'),
      email: z.string().optional().describe('User email address (only for forget mode)'),
      mode: z
        .enum(['clear', 'forget'])
        .describe('"clear" resets the profile data; "forget" permanently deletes the user')
    })
  )
  .output(
    z.object({
      profileId: z.string().optional().describe('ID of the affected profile'),
      deletionId: z
        .string()
        .optional()
        .describe('ID of the deletion record (forget mode only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.mode === 'clear') {
      let result = await client.clearProfile({
        profileId: ctx.input.profileId,
        uid: ctx.input.uid
      });
      return {
        output: { profileId: result.id },
        message: `Profile **${ctx.input.profileId || ctx.input.uid}** has been cleared/reset.`
      };
    }

    let result = await client.deleteProfile({
      profileId: ctx.input.profileId,
      uid: ctx.input.uid,
      email: ctx.input.email
    });
    return {
      output: { profileId: result.profile_id || result.id, deletionId: result.deletion?.id },
      message: `Profile **${ctx.input.profileId || ctx.input.uid || ctx.input.email}** has been permanently deleted.`
    };
  })
  .build();
