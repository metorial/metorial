import { getAuthenticatedUser as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  getGoogleChatAppIdentity,
  mapGoogleChatAppAuthor,
  mapGoogleChatWorkspace
} from '../lib/identity';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

// No app-auth "who am I" endpoint; identity comes from the stored service account.
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
