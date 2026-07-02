import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrayGraphqlClient, TrayRestClient } from '../lib/client';
import { spec } from '../spec';

export let listAuthentications = SlateTool.create(spec, {
  name: 'List Authentications',
  key: 'list_authentications',
  description: `List all service authentications for the authenticated user. Each authentication represents stored credentials for a third-party service connector (e.g., Salesforce, Slack). Returns authentication IDs needed for calling connectors and configuring solution instances.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      authentications: z.array(
        z.object({
          authenticationId: z.string().describe('Unique authentication ID (UUID)'),
          name: z.string().describe('Authentication display name'),
          serviceId: z.string().describe('ID of the associated service'),
          serviceName: z.string().describe('Programmatic name of the service'),
          serviceTitle: z.string().describe('Human-readable service name'),
          serviceEnvironmentId: z.string().describe('Service environment ID')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let authentications = await client.listAuthentications();

    return {
      output: { authentications },
      message: `Found **${authentications.length}** authentication(s).`
    };
  })
  .build();

export let createAuthentication = SlateTool.create(spec, {
  name: 'Create Authentication',
  key: 'create_authentication',
  description: `Create a new service authentication for importing existing credentials into Tray.io. This stores token-based or API key credentials for a third-party service, making them available for connector calls and solution instances.`,
  instructions: [
    'Use "Get Connector Operations" with includeServiceEnvironments=true to discover the serviceEnvironmentId and required credential fields.',
    'The credential data structure varies per service — check the service environment credentials schema.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Display name for the authentication (e.g., "My Salesforce Prod")'),
      serviceId: z.string().describe('Service ID for the connector'),
      serviceEnvironmentId: z
        .string()
        .describe("Service environment ID (from the connector's service environments)"),
      credentialData: z
        .record(z.string(), z.any())
        .describe(
          'Credential data matching the service environment\'s credentials schema (e.g., { "api_key": "..." })'
        ),
      scopes: z.array(z.string()).optional().describe('OAuth scopes if applicable'),
      hidden: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to hide this authentication from the user in the UI')
    })
  )
  .output(
    z.object({
      authenticationId: z.string().describe('ID of the created authentication')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.createUserAuthentication({
      name: ctx.input.name,
      serviceId: ctx.input.serviceId,
      serviceEnvironmentId: ctx.input.serviceEnvironmentId,
      data: ctx.input.credentialData,
      scopes: ctx.input.scopes,
      hidden: ctx.input.hidden
    });

    return {
      output: result,
      message: `Created authentication **${ctx.input.name}** (ID: ${result.authenticationId}).`
    };
  })
  .build();

export let deleteAuthentication = SlateTool.create(spec, {
  name: 'Delete Authentication',
  key: 'delete_authentication',
  description: `Delete a service authentication from Tray.io. This permanently removes the stored credentials. Any solution instances or connector calls using this authentication will stop working.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      authenticationId: z.string().describe('ID of the authentication to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the authentication was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayRestClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteAuthentication(ctx.input.authenticationId);

    return {
      output: { deleted: true },
      message: `Deleted authentication **${ctx.input.authenticationId}**.`
    };
  })
  .build();
