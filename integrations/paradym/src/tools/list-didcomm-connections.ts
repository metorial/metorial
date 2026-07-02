import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDidcommConnections = SlateTool.create(spec, {
  name: 'List DIDComm Connections',
  key: 'list_didcomm_connections',
  description: `Retrieve DIDComm connections established in a Paradym project. Connections are used for credential issuance, verification, and secure messaging between parties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of connections to return per page'),
      pageAfter: z.string().optional().describe('Cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      connections: z
        .array(
          z.object({
            connectionId: z.string().describe('ID of the connection'),
            displayName: z.string().optional().describe('Display name of the connection'),
            ourDid: z.string().optional().describe('Our DID in the connection'),
            theirDid: z.string().optional().describe('Their DID in the connection'),
            status: z.string().optional().describe('Connection status'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of DIDComm connections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.listDidcommConnections({
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageAfter
    });

    let connections = (result.data ?? []).map((c: any) => ({
      connectionId: c.id,
      displayName: c.displayName,
      ourDid: c.ourDid,
      theirDid: c.theirDid,
      status: c.status,
      createdAt: c.createdAt
    }));

    return {
      output: { connections },
      message: `Found **${connections.length}** DIDComm connection(s).`
    };
  })
  .build();
