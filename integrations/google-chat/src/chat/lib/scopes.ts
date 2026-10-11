import { anyOf } from 'slates';
import { googleChatScopes } from '../../scopes';

// Chat actions run as the Chat app: service_account auth with the chat.bot scope.
export let googleChatAppScopes = anyOf(googleChatScopes.bot);

export let googleChatAppAuthMethods = ['service_account'];
