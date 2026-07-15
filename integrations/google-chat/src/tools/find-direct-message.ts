import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { resolveGoogleChatUserName } from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  type GoogleChatSpace,
  googleChatSpaceOutputSchema,
  mapGoogleChatSpace
} from './manage-space';

export let buildFindDirectMessageRequest = (user: string) => ({
  path: 'spaces:findDirectMessage',
  params: {
    name: resolveGoogleChatUserName(user)
  }
});

export let findDirectMessage = SlateTool.create(spec, {
  name: 'Find Direct Message',
  key: 'find_direct_message',
  description:
    'Find the existing Google Chat direct-message space between the specified user and the authenticated user or calling Chat app.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.findDirectMessage)
  .authMethods(googleChatActionAuthMethods.findDirectMessage)
  .input(
    z.object({
      user: z
        .string()
        .trim()
        .min(1)
        .describe('Google Chat user ID, email alias, or users/{user} resource name')
    })
  )
  .output(
    z.object({
      space: googleChatSpaceOutputSchema.describe('Existing direct-message space')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildFindDirectMessageRequest(ctx.input.user);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatSpace>(request.path, {
      method: 'get',
      params: request.params,
      operation: 'find direct message'
    });
    let space = mapGoogleChatSpace(response);

    return {
      output: { space },
      message: `Found direct-message space \`${space.spaceName}\`.`
    };
  })
  .build();
