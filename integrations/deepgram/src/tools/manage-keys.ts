import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

let keySchema = z.object({
  keyId: z.string().describe('Unique API key identifier.'),
  comment: z.string().optional().describe('Description/comment for the key.'),
  scopes: z.array(z.string()).optional().describe('Permission scopes of the key.'),
  tags: z.array(z.string()).optional().describe('Tags assigned to the key.'),
  created: z.string().optional().describe('Creation timestamp.'),
  expirationDate: z.string().optional().describe('Expiration date if set.')
});

export let listKeysTool = SlateTool.create(spec, {
  name: 'List API Keys',
  key: 'list_keys',
  description: `List all API keys for a Deepgram project. Returns key metadata including comments, scopes, tags, and expiration dates. Does not return the actual key values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.')
    })
  )
  .output(
    z.object({
      keys: z.array(keySchema).describe('List of API keys.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listKeys(ctx.input.projectId);

    let keys = (result.api_keys || []).map((k: any) => ({
      keyId: k.api_key_id || k.api_key?.api_key_id,
      comment: k.comment || k.api_key?.comment,
      scopes: k.scopes || k.api_key?.scopes,
      tags: k.tags || k.api_key?.tags,
      created: k.created || k.api_key?.created,
      expirationDate: k.expiration_date || k.api_key?.expiration_date
    }));

    return {
      output: { keys },
      message: `Found **${keys.length}** API key(s) in the project.`
    };
  })
  .build();

export let createKeyTool = SlateTool.create(spec, {
  name: 'Create API Key',
  key: 'create_key',
  description: `Create a new API key for a Deepgram project. The key value is only returned once at creation time. Assign a role (member, admin, or owner) and optional tags for usage tracking.`,
  constraints: [
    'The key value is only shown once at creation time and cannot be retrieved later.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      comment: z
        .string()
        .describe('Description for the API key (e.g., "Production API Key").'),
      scopes: z
        .array(z.string())
        .describe('Permission scopes (e.g., ["member"], ["admin"], ["owner"]).'),
      tags: z.array(z.string()).optional().describe('Tags for usage tracking.'),
      expirationDate: z.string().optional().describe('Expiration date in ISO 8601 format.'),
      timeToLiveInSeconds: z
        .number()
        .optional()
        .describe('Time to live in seconds. Alternative to expirationDate.')
    })
  )
  .output(
    z.object({
      keyId: z.string().describe('Unique API key identifier.'),
      key: z
        .string()
        .optional()
        .describe('The API key value (only available at creation time).'),
      comment: z.string().optional().describe('Description of the key.'),
      scopes: z.array(z.string()).optional().describe('Permission scopes.'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the key.'),
      created: z.string().optional().describe('Creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.createKey(ctx.input.projectId, {
      comment: ctx.input.comment,
      scopes: ctx.input.scopes,
      tags: ctx.input.tags,
      expirationDate: ctx.input.expirationDate,
      timeToLiveInSeconds: ctx.input.timeToLiveInSeconds
    });

    return {
      output: {
        keyId: result.api_key_id,
        key: result.key,
        comment: result.comment,
        scopes: result.scopes,
        tags: result.tags,
        created: result.created
      },
      message: `Created API key **${result.comment || result.api_key_id}**.`
    };
  })
  .build();

export let deleteKeyTool = SlateTool.create(spec, {
  name: 'Delete API Key',
  key: 'delete_key',
  description: `Permanently delete an API key from a Deepgram project. The key will immediately stop working for authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      keyId: z.string().describe('ID of the API key to delete.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    await client.deleteKey(ctx.input.projectId, ctx.input.keyId);

    return {
      output: { message: 'API key deleted successfully.' },
      message: `Deleted API key **${ctx.input.keyId}**.`
    };
  })
  .build();
