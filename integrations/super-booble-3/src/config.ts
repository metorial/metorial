import { SlateConfig } from 'slates';
import { z } from 'zod';

export let configSchema = z.object({
  projectId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Google Cloud or Firebase project ID used by project-scoped tools'),
  defaultZone: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Default Compute Engine zone, for example us-central1-a'),
  defaultRegion: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Default Compute Engine region, for example us-central1'),
  bigQueryLocation: z
    .string()
    .trim()
    .min(1)
    .default('US')
    .describe('Default BigQuery data location, for example US, EU, or us-central1'),
  functionsRegion: z
    .string()
    .trim()
    .min(1)
    .default('us-central1')
    .describe('Default Cloud Functions region, for example us-central1'),
  speechRegion: z
    .string()
    .trim()
    .min(1)
    .default('global')
    .describe('Default Cloud Speech location; global is the safest default'),
  databaseUrl: z
    .string()
    .url()
    .optional()
    .describe('Firebase Realtime Database URL used by Realtime Database tools'),
  storageBucket: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Default Firebase Storage bucket name'),
  webApiKey: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Firebase Web API key used by Firebase Authentication create-user operations')
});

export type SuperGoogle3Config = z.infer<typeof configSchema>;

export let config = SlateConfig.create(configSchema);
