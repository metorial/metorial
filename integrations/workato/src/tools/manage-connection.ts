import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { field, idNumber, numericId, required } from '../lib/validation';
import { spec } from '../spec';

export let manageConnectionTool = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description: `Create, disconnect, or delete a connection to a third-party application. When creating, specify the provider name and a non-Home folder ID and optional credential inputs. Connections can be disconnected (revoked) or permanently deleted.`,
  instructions: [
    'A connection used by active recipes cannot be deleted. Stop the recipes first.',
    'When creating a connection, the input fields depend on the provider. Use shellConnection=true to create a placeholder connection without credential verification.'
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
      shellConnection: z
        .boolean()
        .optional()
        .describe(
          'Create a placeholder without testing or establishing credentials; defaults to false. False can authenticate a third-party application.'
        ),
      force: z.boolean().optional().describe('Force disconnect even if connection is in use')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      connectionId: z.number().optional().describe('ID of the created/affected connection'),
      status: z.string().optional().describe('Status of the operation')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const {
      action,
      connectionId,
      name,
      provider,
      folderId,
      connectionInput,
      force,
      shellConnection
    } = ctx.input;
    if (action === 'create') {
      const result = await client.createConnection({
        name: required(name, 'Name'),
        provider: required(provider, 'Provider'),
        folderId,
        input: connectionInput,
        shellConnection
      });
      const id = idNumber(result.id);
      return {
        output: {
          success: true,
          connectionId: id,
          status: field(result, 'authorization_status', z.string().optional())
        },
        message: `Created connection ${id}. A shell connection has not been authenticated.`
      };
    }
    const id = numericId(connectionId, 'connectionId');
    const result =
      action === 'disconnect'
        ? await client.disconnectConnection(id, force)
        : await client.deleteConnection(id);
    return {
      output: {
        success: true,
        connectionId: idNumber(id),
        status: field(result, 'status', z.string().optional())
      },
      message: `Connection ${action} accepted for ${id}.`
    };
  });
