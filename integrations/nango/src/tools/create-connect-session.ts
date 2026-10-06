import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalid } from '../lib/schemas';
import { spec } from '../spec';

export let createConnectSession = SlateTool.create(spec, {
  name: 'Create Connect Session',
  key: 'create_connect_session',
  description:
    'Connect session creation is unavailable through public tools because the native result grants connection-creation access. Use the Nango Connect UI through a trusted backend for secure end-user authorization. This retained key does not mint a session or send a request.',
  instructions: [
    'Use a trusted Nango backend to create and securely deliver a short-lived Connect session.'
  ]
})
  .input(
    z.object({
      endUserId: z.string().describe('Unique identifier for the end user'),
      endUserEmail: z.string().optional().describe('Email of the end user'),
      endUserDisplayName: z.string().optional().describe('Display name of the end user'),
      endUserTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom tags for the end user'),
      organizationId: z.string().optional().describe('Organization ID the user belongs to'),
      organizationDisplayName: z
        .string()
        .optional()
        .describe('Display name of the organization'),
      allowedIntegrations: z
        .array(z.string())
        .optional()
        .describe('Restrict session to specific integration IDs'),
      integrationsConfigDefaults: z
        .record(z.string(), z.any())
        .optional()
        .describe('Default connection config per integration')
    })
  )
  .output(
    z.object({
      sessionToken: z.string().describe('The connect session token for the frontend SDK'),
      expiresAt: z.string().describe('ISO 8601 expiration timestamp')
    })
  )
  .handleInvocation(async () => {
    throw invalid(
      'Connect session creation is unavailable here because the native token and link authorize connection creation. Use Nango Connect UI through a trusted backend to create and securely deliver the session. No session was created.'
    );
  })
  .build();
