import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Create, update, delete, or export a conversation for an AI agent. Use this tool to manage the lifecycle of conversations.`,
  instructions: [
    'To create a conversation, only provide projectId (and optionally name).',
    'To update, provide projectId, sessionId, and name.',
    'To delete, provide projectId, sessionId, and set action to "delete".',
    'To export, provide projectId, sessionId, and set action to "export".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'export'])
        .describe('Action to perform on the conversation'),
      projectId: z.number().describe('ID of the agent'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID of the conversation (required for update, delete, export)'),
      name: z
        .string()
        .optional()
        .describe('Name for the conversation (used with create and update)')
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional().describe('Conversation session ID'),
      name: z.string().nullable().optional().describe('Conversation name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the conversation was deleted'),
      exportedContent: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Exported conversation content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });
    let { action, projectId, sessionId, name } = ctx.input;

    if (action === 'create') {
      let conversation = await client.createConversation(projectId, { name });
      return {
        output: {
          sessionId: conversation.sessionId,
          name: conversation.name,
          createdAt: conversation.createdAt
        },
        message: `Created conversation **${conversation.sessionId}** for agent **${projectId}**.`
      };
    }

    if (!sessionId) {
      throw new Error('sessionId is required for update, delete, and export actions');
    }

    if (action === 'update') {
      let conversation = await client.updateConversation(projectId, sessionId, { name });
      return {
        output: {
          sessionId: conversation.sessionId,
          name: conversation.name,
          createdAt: conversation.createdAt
        },
        message: `Updated conversation **${sessionId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteConversation(projectId, sessionId);
      return {
        output: { deleted: true, sessionId },
        message: `Deleted conversation **${sessionId}**.`
      };
    }

    // export
    let exported = await client.exportConversation(projectId, sessionId);
    return {
      output: {
        sessionId,
        exportedContent: exported
      },
      message: `Exported conversation **${sessionId}**.`
    };
  })
  .build();
