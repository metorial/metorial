import { getAuthenticatedUser as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  getGoogleChatAppIdentity,
  mapGoogleChatAppAuthor,
  mapGoogleChatWorkspace
} from '../lib/identity';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

/**
 * The connected identity is the Chat app itself. Google exposes no "who am I"
 * endpoint for app authentication, so the identity comes from the service
 * account recorded at connection time.
 */
export let chatGetAuthenticatedUser = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let author = mapGoogleChatAppAuthor(identity);
    let workspace = mapGoogleChatWorkspace(identity);
    return {
      output: { author, workspace, raw: workspace.raw },
      message: `Connected as **${author.fullName}**.`
    };
  })
  .build();
