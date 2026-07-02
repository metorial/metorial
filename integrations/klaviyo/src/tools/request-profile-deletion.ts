import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let requestProfileDeletion = SlateTool.create(spec, {
  name: 'Request Profile Deletion',
  key: 'request_profile_deletion',
  description: `Submit a data privacy deletion request for a profile in Klaviyo. Used for GDPR right-to-erasure and similar privacy compliance.
The profile and all associated data will be permanently deleted.`,
  constraints: [
    'Deletion is irreversible — once submitted, the profile cannot be recovered.',
    'Provide at least one identifier: profileId, email, or phoneNumber.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      profileId: z.string().optional().describe('Profile ID to delete'),
      email: z.string().optional().describe('Email address of the profile to delete'),
      phoneNumber: z.string().optional().describe('Phone number of the profile to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion request was submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (!ctx.input.profileId && !ctx.input.email && !ctx.input.phoneNumber) {
      throw klaviyoServiceError(
        'At least one identifier (profileId, email, or phoneNumber) is required'
      );
    }

    await client.requestProfileDeletion({
      profileId: ctx.input.profileId,
      email: ctx.input.email,
      phoneNumber: ctx.input.phoneNumber
    });

    let identifier =
      ctx.input.profileId ?? ctx.input.email ?? ctx.input.phoneNumber ?? 'unknown';

    return {
      output: { success: true },
      message: `Submitted deletion request for profile **${identifier}**`
    };
  })
  .build();
