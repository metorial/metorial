import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let channelOutputSchema = z.object({
  channelId: z.string().describe('Channel ID'),
  name: z.string().optional().describe('Channel name'),
  isPrivate: z.boolean().optional().describe('Whether the channel is private'),
  isArchived: z.boolean().optional().describe('Whether the channel is archived'),
  topic: z.string().optional().describe('Channel topic'),
  purpose: z.string().optional().describe('Channel purpose')
});

export let manageChannel = SlateTool.create(spec, {
  name: 'Manage Channel',
  key: 'manage_channel',
  description: `Create, update, archive, unarchive, or configure a Slack channel. Combine multiple channel operations in a single action — create a new channel, rename it, set its topic/purpose, or manage its lifecycle.`,
  instructions: [
    'To **create** a channel, set action to "create" and provide a name.',
    'To **update** a channel, set action to "update" and provide the channelId plus fields to change (name, topic, purpose).',
    'To **archive** or **unarchive**, set the corresponding action and provide the channelId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.channelManagement)
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'archive', 'unarchive'])
        .describe('The channel management action to perform'),
      channelId: z
        .string()
        .optional()
        .describe('Channel ID (required for update, archive, unarchive)'),
      name: z
        .string()
        .optional()
        .describe('Channel name (required for create, optional for update/rename)'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Create the channel as private (only for create action)'),
      topic: z.string().optional().describe('Set the channel topic (for create or update)'),
      purpose: z.string().optional().describe('Set the channel purpose (for create or update)')
    })
  )
  .output(channelOutputSchema)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let { action, channelId, name, isPrivate, topic, purpose } = ctx.input;

    if (action === 'create') {
      if (!name) throw missingRequiredFieldError('name', 'create action');

      let channel = await client.createConversation({ name, isPrivate });

      if (topic) await client.setConversationTopic(channel.id, topic);
      if (purpose) await client.setConversationPurpose(channel.id, purpose);

      return {
        output: {
          channelId: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
          isArchived: false,
          topic: topic,
          purpose: purpose
        },
        message: `Created ${isPrivate ? 'private' : 'public'} channel **#${name}** (\`${channel.id}\`).`
      };
    }

    if (!channelId) throw missingRequiredFieldError('channelId', `${action} action`);

    if (action === 'archive') {
      await client.archiveConversation(channelId);
      return {
        output: { channelId, isArchived: true },
        message: `Archived channel \`${channelId}\`.`
      };
    }

    if (action === 'unarchive') {
      await client.unarchiveConversation(channelId);
      return {
        output: { channelId, isArchived: false },
        message: `Unarchived channel \`${channelId}\`.`
      };
    }

    // action === 'update'
    let updatedName: string | undefined;
    if (name) {
      let result = await client.renameConversation(channelId, name);
      updatedName = result.name;
    }
    if (topic !== undefined) await client.setConversationTopic(channelId, topic);
    if (purpose !== undefined) await client.setConversationPurpose(channelId, purpose);

    let info = await client.getConversationInfo(channelId);
    return {
      output: {
        channelId: info.id,
        name: info.name,
        isPrivate: info.is_private,
        isArchived: info.is_archived,
        topic: info.topic?.value,
        purpose: info.purpose?.value
      },
      message: `Updated channel \`${channelId}\`${updatedName ? ` (renamed to **#${updatedName}**)` : ''}.`
    };
  })
  .build();
