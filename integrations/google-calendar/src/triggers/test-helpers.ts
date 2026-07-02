import { createLocalSlateTestClient } from '@slates/test';
import { expect, vi } from 'vitest';
import { provider } from '../index';

(globalThis as typeof globalThis & { expect?: typeof expect }).expect = expect;

let googleClientMocks = vi.hoisted(() => ({
  listEvents: vi.fn(),
  watchEvents: vi.fn(),
  stopChannel: vi.fn(),
  listCalendarList: vi.fn(),
  watchCalendarList: vi.fn(),
  tokens: [] as string[]
}));

vi.mock('../lib/client', () => ({
  GoogleCalendarClient: class {
    constructor(token: string) {
      googleClientMocks.tokens.push(token);
    }

    listEvents(...args: unknown[]) {
      return googleClientMocks.listEvents(...args);
    }

    watchEvents(...args: unknown[]) {
      return googleClientMocks.watchEvents(...args);
    }

    stopChannel(...args: unknown[]) {
      return googleClientMocks.stopChannel(...args);
    }

    listCalendarList(...args: unknown[]) {
      return googleClientMocks.listCalendarList(...args);
    }

    watchCalendarList(...args: unknown[]) {
      return googleClientMocks.watchCalendarList(...args);
    }
  }
}));

export let createGoogleTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: {
          token: 'test-token'
        }
      }
    }
  });

export let getGoogleClientMocks = () => googleClientMocks;

export let resetGoogleTriggerClientMocks = () => {
  googleClientMocks.listEvents.mockReset();
  googleClientMocks.watchEvents.mockReset();
  googleClientMocks.stopChannel.mockReset();
  googleClientMocks.listCalendarList.mockReset();
  googleClientMocks.watchCalendarList.mockReset();
  googleClientMocks.tokens.splice(0);
};
