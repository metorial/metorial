import { anyOf } from 'slates';
import { googleChatScopes } from '../../scopes';

/**
 * Chat adapter actions run as the Chat app: the `service_account` method with
 * the `chat.bot` scope. Each implemented method's reference page lists
 * `chat.bot` app authentication without administrator approval.
 */
export let googleChatAppScopes = anyOf(googleChatScopes.bot);

export let googleChatAppAuthMethods = ['service_account'];
