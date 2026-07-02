import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let manageDid = SlateTool.create(spec, {
  name: 'Manage DID',
  key: 'manage_did',
  description: `Create, retrieve, list, delete, or export a Decentralized Identifier (DID). DIDs are globally unique identifiers that allow their owner to prove cryptographic control.
Supports both native Dock DIDs and Polygon ID DIDs. Use \`keyType: "bjj"\` for Polygon ID DIDs.`,
  instructions: [
    'To create a DID, set action to "create". Optionally specify type (dock or polygonid) and keyType (ed25519, sr25519, secp256k1, bjj).',
    'To retrieve a DID, set action to "get" and provide the did.',
    'To list all DIDs, set action to "list".',
    'To delete a DID, set action to "delete" and provide the did. This is irreversible.',
    'To export a DID, set action to "export", provide the did and a password for encryption.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'delete', 'export'])
        .describe('Operation to perform'),
      did: z
        .string()
        .optional()
        .describe('Fully qualified DID string (required for get, delete, export)'),
      didType: z.enum(['dock', 'polygonid']).optional().describe('Type of DID to create'),
      keyType: z
        .enum(['ed25519', 'sr25519', 'secp256k1', 'bjj'])
        .optional()
        .describe('Key type for the DID. Use bjj for Polygon ID DIDs'),
      controller: z
        .string()
        .optional()
        .describe('DID of the controller. Defaults to the created DID itself'),
      password: z
        .string()
        .optional()
        .describe('Password for encrypting the exported DID document (required for export)'),
      offset: z.number().optional().describe('Pagination offset for list'),
      limit: z.number().optional().describe('Maximum number of results for list')
    })
  )
  .output(
    z.object({
      did: z.string().optional().describe('The DID identifier'),
      didDocument: z.record(z.string(), z.unknown()).optional().describe('The DID document'),
      dids: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of DIDs when using list action'),
      jobId: z
        .string()
        .optional()
        .describe('Job ID for tracking blockchain transaction status'),
      exportedDocument: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Encrypted exported DID document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    switch (ctx.input.action) {
      case 'create': {
        let result = await client.createDid({
          type: ctx.input.didType,
          keyType: ctx.input.keyType,
          controller: ctx.input.controller
        });
        return {
          output: {
            did: result.did as string | undefined,
            didDocument: result,
            jobId: result.id as string | undefined
          },
          message: `Created DID${result.did ? `: **${result.did}**` : ''}. ${result.id ? `Job ID: **${result.id}**` : ''}`
        };
      }
      case 'get': {
        if (!ctx.input.did) throw new Error('did is required for get action');
        let result = await client.getDid(ctx.input.did);
        return {
          output: {
            did: ctx.input.did,
            didDocument: result
          },
          message: `Retrieved DID: **${ctx.input.did}**`
        };
      }
      case 'list': {
        let results = await client.listDids({
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });
        return {
          output: {
            dids: results
          },
          message: `Found **${results.length}** DID(s)`
        };
      }
      case 'delete': {
        if (!ctx.input.did) throw new Error('did is required for delete action');
        let result = await client.deleteDid(ctx.input.did);
        return {
          output: {
            did: ctx.input.did,
            didDocument: result,
            jobId: result.id as string | undefined
          },
          message: `Deleted DID: **${ctx.input.did}**`
        };
      }
      case 'export': {
        if (!ctx.input.did) throw new Error('did is required for export action');
        if (!ctx.input.password) throw new Error('password is required for export action');
        let result = await client.exportDid(ctx.input.did, ctx.input.password);
        return {
          output: {
            did: ctx.input.did,
            exportedDocument: result
          },
          message: `Exported DID: **${ctx.input.did}** as encrypted wallet document`
        };
      }
    }
  })
  .build();
