import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type SlateActionScopes, SlateTool } from 'slates';
import { z } from 'zod';

type SlackClientCtor = new (
  token: string
) => {
  getConversationInfo(channelId: string): Promise<any>;
  deleteScheduledMessage(params: {
    channel: string;
    scheduledMessageId: string;
  }): Promise<void>;
  listScheduledMessages(params?: {
    channel?: string;
    oldest?: string;
    latest?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ scheduledMessages: any[]; nextCursor?: string }>;
  openConversation(params: { users?: string; channel?: string; returnIm?: boolean }): Promise<{
    channel: any;
    alreadyOpen?: boolean;
    noOp?: boolean;
  }>;
};

type SlackToolFactoryDeps = {
  spec: any;
  SlackClient: SlackClientCtor;
  scopes?: {
    getConversationInfo?: SlateActionScopes;
    manageScheduledMessages?: SlateActionScopes;
    openConversation?: SlateActionScopes;
  };
};

let applyScopes = (builder: any, scopes?: SlateActionScopes) =>
  scopes ? builder.scopes(scopes) : builder;

let missingRequiredFieldError = (field: string, context?: string) => {
  let message = `${field} is required${context ? ` for ${context}` : ''}`;

  return new ServiceError(badRequestError({ message }));
};

let conversationInfoOutputSchema = z.object({
  conversationId: z.string().describe('Conversation ID'),
  name: z.string().optional().describe('Conversation name'),
  nameNormalized: z.string().optional().describe('Normalized conversation name'),
  isChannel: z.boolean().optional().describe('Whether this is a public channel'),
  isGroup: z.boolean().optional().describe('Whether this is a private channel'),
  isIm: z.boolean().optional().describe('Whether this is a direct message'),
  isMpim: z.boolean().optional().describe('Whether this is a group direct message'),
  isPrivate: z.boolean().optional().describe('Whether this conversation is private'),
  isArchived: z.boolean().optional().describe('Whether the conversation is archived'),
  isGeneral: z.boolean().optional().describe('Whether this is the workspace general channel'),
  isShared: z.boolean().optional().describe('Whether this conversation is shared'),
  isOrgShared: z.boolean().optional().describe('Whether this conversation is org-shared'),
  isMember: z
    .boolean()
    .optional()
    .describe('Whether the authenticated user or bot is a member'),
  creator: z.string().optional().describe('User ID of the conversation creator'),
  numMembers: z.number().optional().describe('Approximate member count'),
  topic: z.string().optional().describe('Conversation topic'),
  topicCreator: z.string().optional().describe('User ID that set the topic'),
  topicLastSet: z.number().optional().describe('Unix timestamp when topic was last set'),
  purpose: z.string().optional().describe('Conversation purpose'),
  purposeCreator: z.string().optional().describe('User ID that set the purpose'),
  purposeLastSet: z.number().optional().describe('Unix timestamp when purpose was last set'),
  created: z.number().optional().describe('Unix timestamp when the conversation was created'),
  updated: z.number().optional().describe('Unix timestamp when the conversation was updated')
});

let scheduledMessageSchema = z.object({
  scheduledMessageId: z.string().describe('Scheduled message ID'),
  channelId: z.string().optional().describe('Channel where the message is scheduled'),
  postAt: z.number().optional().describe('Unix timestamp when Slack will post the message'),
  createdAt: z
    .number()
    .optional()
    .describe('Unix timestamp when the scheduled message was created'),
  text: z.string().optional().describe('Scheduled message text')
});

let openConversationOutputSchema = z.object({
  conversationId: z.string().describe('Conversation ID for the opened DM or group DM'),
  name: z.string().optional().describe('Conversation name, when Slack returns one'),
  isChannel: z.boolean().optional().describe('Whether this is a public channel'),
  isGroup: z.boolean().optional().describe('Whether this is a private channel'),
  isIm: z.boolean().optional().describe('Whether this is a direct message'),
  isMpim: z.boolean().optional().describe('Whether this is a group direct message'),
  isPrivate: z.boolean().optional().describe('Whether this conversation is private'),
  alreadyOpen: z
    .boolean()
    .optional()
    .describe('Whether Slack reported the conversation was already open'),
  noOp: z.boolean().optional().describe('Whether Slack reported no action was needed')
});

export let createGetConversationInfoTool = ({
  spec,
  SlackClient,
  scopes
}: SlackToolFactoryDeps) =>
  applyScopes(
    SlateTool.create(spec, {
      name: 'Get Conversation Info',
      key: 'get_conversation_info',
      description: `Retrieve stable metadata for a Slack conversation, including channel type, membership, topic, purpose, member count, and timestamps.`,
      tags: {
        destructive: false,
        readOnly: true
      }
    }),
    scopes?.getConversationInfo
  )
    .input(
      z.object({
        channelId: z.string().describe('Slack conversation, channel, DM, or group DM ID')
      })
    )
    .output(conversationInfoOutputSchema)
    .handleInvocation(async (ctx: any) => {
      let client = new SlackClient(ctx.auth.token);
      let conversation = await client.getConversationInfo(ctx.input.channelId);

      return {
        output: {
          conversationId: conversation.id,
          name: conversation.name,
          nameNormalized: conversation.name_normalized,
          isChannel: conversation.is_channel,
          isGroup: conversation.is_group,
          isIm: conversation.is_im,
          isMpim: conversation.is_mpim,
          isPrivate: conversation.is_private,
          isArchived: conversation.is_archived,
          isGeneral: conversation.is_general,
          isShared: conversation.is_shared,
          isOrgShared: conversation.is_org_shared,
          isMember: conversation.is_member,
          creator: conversation.creator,
          numMembers: conversation.num_members,
          topic: conversation.topic?.value,
          topicCreator: conversation.topic?.creator,
          topicLastSet: conversation.topic?.last_set,
          purpose: conversation.purpose?.value,
          purposeCreator: conversation.purpose?.creator,
          purposeLastSet: conversation.purpose?.last_set,
          created: conversation.created,
          updated: conversation.updated
        },
        message: `Retrieved conversation info for \`${conversation.id}\`.`
      };
    })
    .build();

export let createManageScheduledMessagesTool = ({
  spec,
  SlackClient,
  scopes
}: SlackToolFactoryDeps) =>
  applyScopes(
    SlateTool.create(spec, {
      name: 'Manage Scheduled Messages',
      key: 'manage_scheduled_messages',
      description: `List or delete Slack messages that are scheduled to be sent later.`,
      instructions: [
        'To **list**, optionally provide channelId, oldest, latest, limit, or cursor.',
        'To **delete**, provide channelId and scheduledMessageId.'
      ],
      tags: {
        destructive: true,
        readOnly: false
      }
    }),
    scopes?.manageScheduledMessages
  )
    .input(
      z.object({
        action: z.enum(['list', 'delete']).describe('Scheduled message action to perform'),
        channelId: z
          .string()
          .optional()
          .describe('Channel ID to filter by, or required when deleting'),
        scheduledMessageId: z.string().optional().describe('Scheduled message ID to delete'),
        oldest: z
          .string()
          .optional()
          .describe('Only list scheduled messages after this Slack timestamp'),
        latest: z
          .string()
          .optional()
          .describe('Only list scheduled messages before this Slack timestamp'),
        limit: z.number().optional().describe('Maximum scheduled messages to return'),
        cursor: z.string().optional().describe('Pagination cursor for the next page')
      })
    )
    .output(
      z.object({
        scheduledMessages: z
          .array(scheduledMessageSchema)
          .optional()
          .describe('Scheduled messages returned by the list action'),
        nextCursor: z.string().optional().describe('Cursor for the next page of results'),
        deleted: z.boolean().optional().describe('Whether a scheduled message was deleted'),
        channelId: z.string().optional().describe('Channel ID used for the action'),
        scheduledMessageId: z
          .string()
          .optional()
          .describe('Scheduled message ID used for the action')
      })
    )
    .handleInvocation(async (ctx: any) => {
      let client = new SlackClient(ctx.auth.token);

      if (ctx.input.action === 'delete') {
        if (!ctx.input.channelId) {
          throw missingRequiredFieldError('channelId', 'delete action');
        }
        if (!ctx.input.scheduledMessageId) {
          throw missingRequiredFieldError('scheduledMessageId', 'delete action');
        }

        await client.deleteScheduledMessage({
          channel: ctx.input.channelId,
          scheduledMessageId: ctx.input.scheduledMessageId
        });

        return {
          output: {
            deleted: true,
            channelId: ctx.input.channelId,
            scheduledMessageId: ctx.input.scheduledMessageId
          },
          message: `Deleted scheduled message \`${ctx.input.scheduledMessageId}\` from channel \`${ctx.input.channelId}\`.`
        };
      }

      let result = await client.listScheduledMessages({
        channel: ctx.input.channelId,
        oldest: ctx.input.oldest,
        latest: ctx.input.latest,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      });

      return {
        output: {
          scheduledMessages: result.scheduledMessages.map(message => ({
            scheduledMessageId: message.id ?? message.scheduled_message_id ?? '',
            channelId: message.channel_id,
            postAt: message.post_at,
            createdAt: message.date_created,
            text: message.text
          })),
          nextCursor: result.nextCursor,
          channelId: ctx.input.channelId
        },
        message: `Listed ${result.scheduledMessages.length} scheduled message(s).`
      };
    })
    .build();

export let createOpenConversationTool = ({
  spec,
  SlackClient,
  scopes
}: SlackToolFactoryDeps) =>
  applyScopes(
    SlateTool.create(spec, {
      name: 'Open Conversation',
      key: 'open_conversation',
      description: `Open or resume a Slack direct message or group direct message with one or more users.`,
      constraints: ['Provide 1 to 8 Slack user IDs.'],
      tags: {
        destructive: false,
        readOnly: false
      }
    }),
    scopes?.openConversation
  )
    .input(
      z.object({
        userIds: z
          .array(z.string())
          .min(1)
          .max(8)
          .describe('Slack user IDs to include in the DM or group DM'),
        returnIm: z
          .boolean()
          .optional()
          .describe('Return the full IM object when Slack supports it (defaults to true)')
      })
    )
    .output(openConversationOutputSchema)
    .handleInvocation(async (ctx: any) => {
      let client = new SlackClient(ctx.auth.token);
      let result = await client.openConversation({
        users: ctx.input.userIds.join(','),
        returnIm: ctx.input.returnIm ?? true
      });
      let conversation = result.channel;

      return {
        output: {
          conversationId: conversation.id,
          name: conversation.name,
          isChannel: conversation.is_channel,
          isGroup: conversation.is_group,
          isIm: conversation.is_im,
          isMpim: conversation.is_mpim,
          isPrivate: conversation.is_private,
          alreadyOpen: result.alreadyOpen,
          noOp: result.noOp
        },
        message: `Opened conversation \`${conversation.id}\` with ${ctx.input.userIds.length} user(s).`
      };
    })
    .build();
