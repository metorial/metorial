import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { zapierServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createAuthentication = SlateTool.create(spec, {
  name: 'Create Authentication',
  key: 'create_authentication',
  description: `Create a new authentication (connected account) for a Zapier app. This works for apps that support API key-based authentication.
For OAuth-based apps, users must complete the authorization flow in a browser instead.`,
  instructions: [
    'The authenticationFields object should contain the required credentials for the target app (e.g., API key, secret).',
    'Use the app ID from the /v2/apps endpoint.'
  ],
  constraints: [
    'Only works for apps that support API key-based authentication. OAuth-based apps require a browser-based flow.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('App UUID from the /v2/apps endpoint'),
      title: z
        .string()
        .describe('Label for the new authentication (e.g., "My Company API Key")'),
      authenticationFields: z
        .record(z.string(), z.string())
        .describe('Credential fields required by the app (e.g., { "api_key": "sk-..." })')
    })
  )
  .output(
    z.object({
      authenticationId: z
        .string()
        .describe('Unique identifier for the created authentication'),
      appId: z.string().describe('Associated app ID'),
      title: z.string().describe('Authentication label'),
      isExpired: z.boolean().describe('Whether the authentication is expired')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createAuthentication({
      title: ctx.input.title,
      app: ctx.input.appId,
      authenticationFields: ctx.input.authenticationFields
    });

    let created = response.data?.[0];
    if (!created) {
      throw zapierServiceError('Zapier did not return the created authentication.');
    }

    return {
      output: {
        authenticationId: created.id,
        appId: String(created.app),
        title: created.title,
        isExpired: created.isExpired
      },
      message: `Created authentication **"${created.title}"** (ID: \`${created.id}\`) for app \`${ctx.input.appId}\`.`
    };
  })
  .build();
