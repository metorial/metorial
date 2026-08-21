import type { ChatErrorCode } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { mapSlackChatError, type SlackChatErrorContext } from './errors';

export interface SlackChatClientOptions {
  action: string;
  ambiguous?: Record<string, ChatErrorCode>;
  scopes?: string[];
  context?: Omit<SlackChatErrorContext, 'action' | 'ambiguous' | 'scopes'>;
}

let contextFromInput = (input: unknown): SlackChatErrorContext => {
  if (!input || typeof input !== 'object') return {};

  let source = input as Record<string, unknown>;
  let pick = (key: string) => (typeof source[key] === 'string' ? source[key] : undefined);

  return {
    channelId: pick('channelId'),
    threadId: pick('threadId'),
    messageId: pick('messageId'),
    userId: pick('userId') ?? pick('targetUserId'),
    workspaceId: pick('workspaceId'),
    triggerId: pick('triggerId')
  };
};

type SlackChatClientContext = {
  auth: { token: string };
  input?: unknown;
};

export let createSlackChatClient = (
  ctx: SlackChatClientContext,
  options: SlackChatClientOptions
): SlackClient => {
  let client = new SlackClient(ctx.auth.token);

  let errorContext: SlackChatErrorContext = {
    action: options.action,
    ambiguous: options.ambiguous,
    scopes: options.scopes,
    ...contextFromInput(ctx.input),
    ...options.context
  };

  return new Proxy(client, {
    get(target, property, receiver) {
      let value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;

      return (...args: unknown[]) => {
        try {
          let result = (value as (...a: unknown[]) => unknown).apply(target, args);

          if (result instanceof Promise) {
            return result.catch((error: unknown) => {
              throw mapSlackChatError(error, errorContext);
            });
          }

          return result;
        } catch (error) {
          throw mapSlackChatError(error, errorContext);
        }
      };
    }
  });
};
