import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let createConnectSession = SlateTool.create(spec, {
  name: 'Create Connect Session',
  key: 'create_connect_session',
  description: `Create a short-lived connect session token for the frontend SDK. The session lasts 30 minutes and enables end users to initiate OAuth flows or provide API credentials through a pre-built UI. Sessions can be scoped to specific integrations and carry end-user metadata.`,
  instructions: [
    'The returned session token should be passed to the Nango frontend SDK.',
    'End user ID is required; email and display name are recommended for better UX in the Nango UI.'
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
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createConnectSession({
      end_user: {
        id: ctx.input.endUserId,
        email: ctx.input.endUserEmail,
        display_name: ctx.input.endUserDisplayName,
        tags: ctx.input.endUserTags
      },
      organization: ctx.input.organizationId
        ? {
            id: ctx.input.organizationId,
            display_name: ctx.input.organizationDisplayName
          }
        : undefined,
      allowed_integrations: ctx.input.allowedIntegrations,
      integrations_config_defaults: ctx.input.integrationsConfigDefaults
    });

    return {
      output: {
        sessionToken: result.data.token,
        expiresAt: result.data.expires_at
      },
      message: `Created connect session for user **${ctx.input.endUserId}**. Expires at ${result.data.expires_at}.`
    };
  })
  .build();
