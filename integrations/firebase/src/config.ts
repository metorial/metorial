import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .describe('Firebase project ID (found in Firebase Console > Project Settings)'),
    databaseUrl: z
      .string()
      .optional()
      .describe(
        'Realtime Database URL, e.g. https://<DATABASE_NAME>.firebaseio.com. Required for Realtime Database operations.'
      ),
    storageBucket: z
      .string()
      .optional()
      .describe(
        'Default Firebase Storage bucket name. If omitted, storage tools use <projectId>.appspot.com.'
      ),
    webApiKey: z
      .string()
      .optional()
      .describe(
        'Firebase Web API key. Required by the Firebase Authentication REST API for create user operations.'
      )
  })
);
