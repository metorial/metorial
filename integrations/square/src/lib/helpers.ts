import { createApiServiceError } from 'slates';
import { SquareClient } from './client';
import type { SquareClientConfig } from './types';

export let createClient = (auth: SquareClientConfig) => new SquareClient(auth);

export let generateIdempotencyKey = (): string => crypto.randomUUID();

export let requireSquareScopes = (auth: { scopes: string[] }, scopes: string[]) => {
  let missing = scopes.filter(scope => !auth.scopes.includes(scope));
  if (missing.length) {
    throw createApiServiceError(
      `Reconnect Square with the required permissions: ${missing.join(', ')}.`,
      { reason: 'square_missing_scopes' }
    );
  }
};
