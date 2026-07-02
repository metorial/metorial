import { createApiServiceError } from 'slates';

type ActionHandler<T> = () => T | Promise<T>;

export let dispatchAuth0Action = async <T>(
  action: string,
  handlers: Record<string, ActionHandler<T>>
) => {
  let handler = handlers[action];
  if (!handler) {
    throw createApiServiceError(`Unknown action: ${action}`);
  }

  return handler();
};
