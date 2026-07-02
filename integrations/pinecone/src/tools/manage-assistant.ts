import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAssistantTool = SlateTool.create(spec, {
  name: 'Manage Assistant',
  key: 'manage_assistant',
  description: `Create, list, describe, update, or delete Pinecone Assistants. Assistants provide RAG-based document Q&A powered by uploaded documents. Can be deployed in US or EU regions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'describe', 'update', 'delete'])
        .describe('Action to perform'),
      assistantName: z
        .string()
        .optional()
        .describe('Name of the assistant (required for create, describe, delete)'),
      instructions: z
        .string()
        .optional()
        .describe('Custom instructions for the assistant (for create or update)'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata for the assistant (for create or update)'),
      region: z
        .enum(['us', 'eu'])
        .optional()
        .describe('Deployment region (for create, defaults to us)')
    })
  )
  .output(
    z.object({
      assistants: z
        .array(
          z.object({
            assistantName: z.string().describe('Name of the assistant'),
            instructions: z.string().optional().describe('Custom instructions'),
            metadata: z.record(z.string(), z.any()).optional().describe('Assistant metadata'),
            status: z.string().describe('Current status'),
            host: z.string().optional().describe('Host URL for data operations'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of assistants (for list/describe)'),
      deleted: z.boolean().optional().describe('Whether the assistant was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listAssistants();
      let assistants = (result.assistants || []).map(a => ({
        assistantName: a.name,
        instructions: a.instructions || undefined,
        metadata: a.metadata || undefined,
        status: a.status,
        host: a.host,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
      return {
        output: { assistants },
        message: `Found **${assistants.length}** assistant${assistants.length === 1 ? '' : 's'}${assistants.length > 0 ? `: ${assistants.map(a => `\`${a.assistantName}\``).join(', ')}` : ''}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.assistantName) {
        throw pineconeServiceError('assistantName is required for create.');
      }
      let result = await client.createAssistant({
        name: ctx.input.assistantName,
        instructions: ctx.input.instructions,
        metadata: ctx.input.metadata,
        region: ctx.input.region
      });
      return {
        output: {
          assistants: [
            {
              assistantName: result.name,
              instructions: result.instructions || undefined,
              metadata: result.metadata || undefined,
              status: result.status,
              host: result.host,
              createdAt: result.created_at,
              updatedAt: result.updated_at
            }
          ]
        },
        message: `Created assistant \`${result.name}\`. Status: ${result.status}.`
      };
    }

    if (ctx.input.action === 'describe') {
      if (!ctx.input.assistantName) {
        throw pineconeServiceError('assistantName is required for describe.');
      }
      let result = await client.describeAssistant(ctx.input.assistantName);
      return {
        output: {
          assistants: [
            {
              assistantName: result.name,
              instructions: result.instructions || undefined,
              metadata: result.metadata || undefined,
              status: result.status,
              host: result.host,
              createdAt: result.created_at,
              updatedAt: result.updated_at
            }
          ]
        },
        message: `Assistant \`${result.name}\`: status=${result.status}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.assistantName) {
        throw pineconeServiceError('assistantName is required for update.');
      }
      if (!ctx.input.instructions && !ctx.input.metadata) {
        throw pineconeServiceError(
          'Provide instructions or metadata when updating an assistant.'
        );
      }
      let result = await client.updateAssistant(ctx.input.assistantName, {
        instructions: ctx.input.instructions,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          assistants: [
            {
              assistantName: result.name,
              instructions: result.instructions || undefined,
              metadata: result.metadata || undefined,
              status: result.status,
              host: result.host,
              createdAt: result.created_at,
              updatedAt: result.updated_at
            }
          ]
        },
        message: `Updated assistant \`${result.name}\`. Status: ${result.status}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.assistantName) {
        throw pineconeServiceError('assistantName is required for delete.');
      }
      await client.deleteAssistant(ctx.input.assistantName);
      return {
        output: { deleted: true },
        message: `Deleted assistant \`${ctx.input.assistantName}\`.`
      };
    }

    throw pineconeServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
