import { configV1Compatibility } from 'slates';
import { z } from 'zod';

// Kept loose so configs stored before the instance URL moved to the auth
// method keep validating; tools read that legacy value only as a fallback.
export let config = configV1Compatibility({
  schema: z.looseObject({}),
  compatibility: {
    integrationId: 'looker',
    owner: 'integrations-platform',
    expiresAt: '2026-10-01T00:00:00.000Z',
    cutoffAt: '2026-10-01T00:00:00.000Z'
  }
});
