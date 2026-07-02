import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.string().describe('Label ID.'),
  name: z.string().describe('Label name.'),
  type: z.string().describe('Label type (system or user).'),
  messageListVisibility: z.string().optional().describe('Visibility in message list.'),
  labelListVisibility: z.string().optional().describe('Visibility in label list.'),
  messagesTotal: z.number().optional().describe('Total messages with this label.'),
  messagesUnread: z.number().optional().describe('Unread messages with this label.'),
  threadsTotal: z.number().optional().describe('Total threads with this label.'),
  threadsUnread: z.number().optional().describe('Unread threads with this label.'),
  backgroundColor: z.string().optional().describe('Label background color.'),
  textColor: z.string().optional().describe('Label text color.')
});

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `List, create, update, get, or delete Gmail labels. Labels organize messages and threads (e.g., INBOX, SENT, STARRED, or custom labels).`,
  instructions: [
    'Use **action** "list" to get all labels in the mailbox.',
    'Use **action** "create" to create a new label. Provide **name** at minimum.',
    'Use **action** "update" to modify an existing label (name, visibility, color).',
    'Use **action** "get" to retrieve details for a specific label.',
    'Use **action** "delete" to permanently remove a user-created label.'
  ],
  tags: {
    readOnly: false
  }
})
  .scopes(gmailActionScopes.manageLabels)
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'get', 'delete'])
        .describe('Label operation to perform.'),
      labelId: z.string().optional().describe('Label ID (required for get, update, delete).'),
      name: z.string().optional().describe('Label name (for create/update).'),
      messageListVisibility: z
        .enum(['show', 'hide'])
        .optional()
        .describe('Visibility in message list.'),
      labelListVisibility: z
        .enum(['labelShow', 'labelShowIfUnread', 'labelHide'])
        .optional()
        .describe('Visibility in label list.'),
      backgroundColor: z
        .string()
        .optional()
        .describe('Background color hex (e.g., "#16a765").'),
      textColor: z.string().optional().describe('Text color hex (e.g., "#ffffff").')
    })
  )
  .output(
    z.object({
      label: labelSchema
        .optional()
        .describe('Single label details (for create, update, get).'),
      labels: z.array(labelSchema).optional().describe('List of labels (for list action).'),
      deleted: z.boolean().optional().describe('Whether deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { action } = ctx.input;

    let mapLabel = (l: any) => ({
      labelId: l.id,
      name: l.name,
      type: l.type ?? 'user',
      messageListVisibility: l.messageListVisibility,
      labelListVisibility: l.labelListVisibility,
      messagesTotal: l.messagesTotal,
      messagesUnread: l.messagesUnread,
      threadsTotal: l.threadsTotal,
      threadsUnread: l.threadsUnread,
      backgroundColor: l.color?.backgroundColor,
      textColor: l.color?.textColor
    });

    if (action === 'list') {
      let labels = await client.listLabels();
      return {
        output: {
          labels: labels.map(mapLabel)
        },
        message: `Found **${labels.length}** labels.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let label = await client.createLabel({
        name: ctx.input.name,
        messageListVisibility: ctx.input.messageListVisibility,
        labelListVisibility: ctx.input.labelListVisibility,
        backgroundColor: ctx.input.backgroundColor,
        textColor: ctx.input.textColor
      });
      return {
        output: { label: mapLabel(label) },
        message: `Label "${ctx.input.name}" created.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.labelId) throw new Error('labelId is required for update action');
      let label = await client.updateLabel(ctx.input.labelId, {
        name: ctx.input.name,
        messageListVisibility: ctx.input.messageListVisibility,
        labelListVisibility: ctx.input.labelListVisibility,
        backgroundColor: ctx.input.backgroundColor,
        textColor: ctx.input.textColor
      });
      return {
        output: { label: mapLabel(label) },
        message: `Label **${ctx.input.labelId}** updated.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.labelId) throw new Error('labelId is required for get action');
      let label = await client.getLabel(ctx.input.labelId);
      return {
        output: { label: mapLabel(label) },
        message: `Retrieved label "${label.name}".`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.labelId) throw new Error('labelId is required for delete action');
      await client.deleteLabel(ctx.input.labelId);
      return {
        output: { deleted: true },
        message: `Label **${ctx.input.labelId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
