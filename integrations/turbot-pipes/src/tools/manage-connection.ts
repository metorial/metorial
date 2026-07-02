import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let connectionOutputSchema = z.object({
  connectionId: z.string().describe('Unique connection identifier'),
  handle: z.string().describe('Connection handle'),
  plugin: z.string().optional().describe('Plugin name'),
  type: z.string().optional().describe('Connection type'),
  credentialSource: z.string().optional().describe('Credential source'),
  state: z.string().optional().describe('Connection state'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let createConnection = SlateTool.create(spec, {
  name: 'Create Connection',
  key: 'create_connection',
  description: `Create a new connection to an external system. Connections provide credentials and configuration for Steampipe plugins to query cloud resources and for Flowpipe pipelines to perform actions.`,
  instructions: [
    'The plugin name must match a supported Steampipe plugin (e.g. "aws", "azure", "gcp", "github").',
    'Connection config varies by plugin - check the plugin documentation for required fields.'
  ]
})
  .input(
    z.object({
      handle: z.string().describe('Unique handle for the connection'),
      plugin: z.string().describe('Plugin name (e.g. "aws", "azure", "gcp", "github")'),
      config: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Plugin-specific connection configuration'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization')
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let connection: any;
    if (ctx.input.ownerType === 'org') {
      connection = await client.createOrgConnection(ownerHandle, {
        handle: ctx.input.handle,
        plugin: ctx.input.plugin,
        config: ctx.input.config
      });
    } else {
      connection = await client.createUserConnection(ownerHandle, {
        handle: ctx.input.handle,
        plugin: ctx.input.plugin,
        config: ctx.input.config
      });
    }

    return {
      output: connection,
      message: `Created connection **${connection.handle}** (plugin: ${connection.plugin || ctx.input.plugin}).`
    };
  })
  .build();

export let updateConnection = SlateTool.create(spec, {
  name: 'Update Connection',
  key: 'update_connection',
  description: `Update an existing connection's handle or configuration.`
})
  .input(
    z.object({
      connectionHandle: z.string().describe('Handle of the connection to update'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization'),
      handle: z.string().optional().describe('New handle for the connection'),
      config: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated plugin-specific connection configuration')
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let connection: any;
    if (ctx.input.ownerType === 'org') {
      connection = await client.updateOrgConnection(ownerHandle, ctx.input.connectionHandle, {
        handle: ctx.input.handle,
        config: ctx.input.config
      });
    } else {
      connection = await client.updateUserConnection(ownerHandle, ctx.input.connectionHandle, {
        handle: ctx.input.handle,
        config: ctx.input.config
      });
    }

    return {
      output: connection,
      message: `Updated connection **${connection.handle}**.`
    };
  })
  .build();

export let deleteConnection = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Permanently delete a connection. This will remove the connection's credentials and configuration from Turbot Pipes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionHandle: z.string().describe('Handle of the connection to delete'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('Deleted connection identifier'),
      handle: z.string().describe('Deleted connection handle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let connection: any;
    if (ctx.input.ownerType === 'org') {
      connection = await client.deleteOrgConnection(ownerHandle, ctx.input.connectionHandle);
    } else {
      connection = await client.deleteUserConnection(ownerHandle, ctx.input.connectionHandle);
    }

    return {
      output: connection,
      message: `Deleted connection **${connection.handle}**.`
    };
  })
  .build();

export let testConnection = SlateTool.create(spec, {
  name: 'Test Connection',
  key: 'test_connection',
  description: `Test a connection to verify that its credentials and configuration are valid. Returns the test result indicating whether the connection can successfully communicate with the external system.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionHandle: z.string().describe('Handle of the connection to test'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user). Defaults to the authenticated user.')
    })
  )
  .output(
    z.object({
      testResult: z.unknown().describe('Test result from the provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let testResult = await client.testUserConnection(ownerHandle, ctx.input.connectionHandle);

    return {
      output: { testResult },
      message: `Connection test completed for **${ctx.input.connectionHandle}**.`
    };
  })
  .build();
