import { configV1Compatibility } from 'slates';
import { z } from 'zod';

export let config = configV1Compatibility({
  schema: z.looseObject({}),
  compatibility: {
    integrationId: 'tableau',
    owner: 'integrations-platform',
    expiresAt: '2026-10-01T00:00:00.000Z',
    cutoffAt: '2026-10-01T00:00:00.000Z'
  }
});
