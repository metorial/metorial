import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .describe('Firebase project ID (found in Firebase Console > Project Settings)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    databaseUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Realtime Database URL, e.g. https://<DATABASE_NAME>.firebaseio.com. Required for Realtime Database operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    storageBucket: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Firebase Storage bucket name. If omitted, storage tools use <projectId>.appspot.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    webApiKey: {
      schema: z
        .string()
        .optional()
        .describe(
          'Firebase Web API key. Required by the Firebase Authentication REST API for create user operations.'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
