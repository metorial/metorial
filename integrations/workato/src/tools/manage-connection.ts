import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let manageConnectionTool = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description: `Create, disconnect, or delete a connection to a third-party application. When creating, specify the provider name and optional credential inputs. Connections can be disconnected (revoked) or permanently deleted.`,
  instructions: [
    'A connection used by active recipes cannot be deleted. Stop the recipes first.',
    'When creating a connection, the input fields depend on the provider. Use shell_connection mode to create a placeholder connection without credential verification.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'disconnect', 'delete']).describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID (required for disconnect/delete)'),
      name: z.string().optional().describe('Connection name (required for create)'),
      provider: z
        .string()
        .optional()
        .describe(
          'Provider/application name (required for create, e.g. "salesforce", "jira")'
        ),
      folderId: z.number().optional().describe('Folder ID for the new connection'),
      connectionInput: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider-specific credential fields (e.g. host_name, api_token)'),
      force: z.boolean().optional().describe('Force disconnect even if connection is in use')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      connectionId: z.number().optional().describe('ID of the created/affected connection'),
      status: z.string().optional().describe('Status of the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, connectionId, name, provider, folderId, connectionInput, force } = ctx.input;

    if (action === 'create') {
      if (!name || !provider)
        throw new Error('Name and provider are required when creating a connection');
      let result = await client.createConnection({
        name,
        provider,
        folderId,
        input: connectionInput
      });
      return {
        output: {
          success: true,
          connectionId: result.id,
          status: result.authorization_status ?? 'created'
        },
        message: `Created connection **${name}** (${provider}) with ID ${result.id}.`
      };
    }

    if (!connectionId) throw new Error('Connection ID is required for disconnect/delete');

    if (action === 'disconnect') {
      let result = await client.disconnectConnection(connectionId, force);
      return {
        output: {
          success: result.success ?? true,
          connectionId: Number(connectionId),
          status: result.status ?? 'disconnected'
        },
        message: `Disconnected connection **${connectionId}**.`
      };
    }

    // delete
    let result = await client.deleteConnection(connectionId);
    return {
      output: {
        success: result.success ?? true,
        connectionId: Number(connectionId),
        status: result.status ?? 'deleted'
      },
      message: `Deleted connection **${connectionId}**.`
    };
  });
