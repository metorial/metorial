import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { nativeProfile } from '../lib/schemas';
import { spec } from '../spec';
export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the actual authenticated personal user profile. This endpoint requires a user session and is unavailable to robot tokens; project access does not imply user identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(nativeProfile)
  .handleInvocation(async ctx => ({
    output: await new SanityClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    }).getCurrentUser(),
    message: 'Retrieved the native personal user profile.'
  }))
  .build();
