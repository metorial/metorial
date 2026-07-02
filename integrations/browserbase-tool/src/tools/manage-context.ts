import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContext = SlateTool.create(spec, {
  name: 'Create Context',
  key: 'create_context',
  description: `Create a new persistent browser context. Contexts allow reusing cookies, localStorage, IndexedDB, and authentication tokens across multiple browser sessions, eliminating repeated logins.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contextId: z.string().describe('Context identifier'),
      uploadUrl: z.string().describe('URL to upload custom user-data-directory'),
      publicKey: z.string().describe('Public key for encrypting user-data-directory'),
      cipherAlgorithm: z.string().describe('Encryption algorithm'),
      initializationVectorSize: z.number().describe('IV size for encryption')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let context = await client.createContext(ctx.config.projectId);

    return {
      output: {
        contextId: context.contextId,
        uploadUrl: context.uploadUrl,
        publicKey: context.publicKey,
        cipherAlgorithm: context.cipherAlgorithm,
        initializationVectorSize: context.initializationVectorSize
      },
      message: `Created context **${context.contextId}**. Use this context ID when creating sessions to persist browser state.`
    };
  })
  .build();

export let getContext = SlateTool.create(spec, {
  name: 'Get Context',
  key: 'get_context',
  description: `Retrieve details about a persistent browser context including creation time and linked project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contextId: z.string().describe('The context ID to retrieve')
    })
  )
  .output(
    z.object({
      contextId: z.string().describe('Context identifier'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      projectId: z.string().describe('Linked project ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let context = await client.getContext(ctx.input.contextId);

    return {
      output: {
        contextId: context.contextId,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
        projectId: context.projectId
      },
      message: `Retrieved context **${context.contextId}** (last updated: ${context.updatedAt}).`
    };
  })
  .build();

export let deleteContext = SlateTool.create(spec, {
  name: 'Delete Context',
  key: 'delete_context',
  description: `Delete a persistent browser context. This permanently removes all stored cookies, localStorage, and other browser state associated with the context.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contextId: z.string().describe('The context ID to delete')
    })
  )
  .output(
    z.object({
      contextId: z.string().describe('Deleted context ID'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContext(ctx.input.contextId);

    return {
      output: {
        contextId: ctx.input.contextId,
        deleted: true
      },
      message: `Deleted context **${ctx.input.contextId}** and all associated browser state.`
    };
  })
  .build();
