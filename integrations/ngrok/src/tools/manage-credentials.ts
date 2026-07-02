import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let credentialOutputSchema = z.object({
  credentialId: z.string().describe('Credential ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  authtokenValue: z
    .string()
    .optional()
    .nullable()
    .describe('Authtoken value (only at creation)'),
  acl: z.array(z.string()).describe('ACL rules restricting what the token can bind'),
  ownerId: z.string().describe('Owner user or bot user ID')
});

let mapCredential = (c: any) => ({
  credentialId: c.id,
  uri: c.uri || '',
  createdAt: c.created_at || '',
  description: c.description || '',
  metadata: c.metadata || '',
  authtokenValue: c.token || null,
  acl: c.acl || [],
  ownerId: c.owner_id || ''
});

export let listCredentials = SlateTool.create(spec, {
  name: 'List Tunnel Credentials',
  key: 'list_credentials',
  description: `List all tunnel credentials (authtokens). Authtokens authorize ngrok agents to connect to the ngrok service. ACL rules can restrict which domains, addresses, or labels each token can bind.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      credentials: z.array(credentialOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listCredentials({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let credentials = (result.credentials || []).map(mapCredential);
    return {
      output: { credentials, nextPageUri: result.next_page_uri || null },
      message: `Found **${credentials.length}** credential(s).`
    };
  })
  .build();

export let getCredential = SlateTool.create(spec, {
  name: 'Get Tunnel Credential',
  key: 'get_credential',
  description: `Retrieve details of a specific tunnel credential (authtoken) by ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      credentialId: z.string().describe('Credential ID (e.g., cr_xxx)')
    })
  )
  .output(credentialOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let c = await client.getCredential(ctx.input.credentialId);
    return {
      output: mapCredential(c),
      message: `Retrieved credential **${c.id}**.`
    };
  })
  .build();

export let createCredential = SlateTool.create(spec, {
  name: 'Create Tunnel Credential',
  key: 'create_credential',
  description: `Create a new tunnel credential (authtoken) for ngrok agent authentication. **Important:** The token value is only returned at creation time. Optionally restrict the token with ACL bind rules.`,
  instructions: [
    'Save the returned authtokenValue immediately as it cannot be retrieved later.',
    'ACL rules use the format "bind:domain.example.com" or "bind:*.example.com".'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)'),
      acl: z
        .array(z.string())
        .optional()
        .describe('ACL bind rules (e.g., ["bind:example.ngrok.io"])'),
      ownerId: z.string().optional().describe('Owner user or bot user ID')
    })
  )
  .output(credentialOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let c = await client.createCredential({
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      acl: ctx.input.acl,
      ownerId: ctx.input.ownerId
    });
    return {
      output: mapCredential(c),
      message: `Created credential **${c.id}**. ⚠️ Save the authtoken now — it won't be shown again.`
    };
  })
  .build();

export let updateCredential = SlateTool.create(spec, {
  name: 'Update Tunnel Credential',
  key: 'update_credential',
  description: `Update a tunnel credential's description, metadata, or ACL rules.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      credentialId: z.string().describe('Credential ID to update'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata'),
      acl: z.array(z.string()).optional().describe('New ACL rules')
    })
  )
  .output(credentialOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let c = await client.updateCredential(ctx.input.credentialId, {
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      acl: ctx.input.acl
    });
    return {
      output: mapCredential(c),
      message: `Updated credential **${c.id}**.`
    };
  })
  .build();

export let deleteCredential = SlateTool.create(spec, {
  name: 'Delete Tunnel Credential',
  key: 'delete_credential',
  description: `Delete a tunnel credential. Agents using this authtoken will no longer be able to connect.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      credentialId: z.string().describe('Credential ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteCredential(ctx.input.credentialId);
    return {
      output: { success: true },
      message: `Deleted credential **${ctx.input.credentialId}**.`
    };
  })
  .build();
