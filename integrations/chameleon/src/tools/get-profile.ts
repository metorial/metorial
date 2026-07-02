import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_profile',
  description: `Retrieve a single Chameleon user profile by its Chameleon profile ID, external UID, or email address.
Returns the full user profile including all custom properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z.string().optional().describe('Chameleon user profile ID'),
      uid: z.string().optional().describe('External user identifier from your backend system'),
      email: z.string().optional().describe('User email address')
    })
  )
  .output(
    z.object({
      profile: z
        .record(z.string(), z.unknown())
        .describe('The user profile object with all properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    let result = await client.getProfile({
      profileId: ctx.input.profileId,
      uid: ctx.input.uid,
      email: ctx.input.email
    });

    return {
      output: { profile: result },
      message: `Retrieved profile for user **${result.uid || result.email || result.id}**.`
    };
  })
  .build();
