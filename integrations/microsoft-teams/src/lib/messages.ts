import { createApiServiceError } from 'slates';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/graph/api/resources/chatmessagemention?view=graph-rest-1.0
export let mentionsInputSchema = z
  .array(
    z.object({
      userId: z.string().describe('Microsoft Entra object ID of the user to mention'),
      displayName: z
        .string()
        .describe('Name shown for the mention; must match the text inside the <at> tag')
    })
  )
  .optional()
  .describe(
    'Users to @mention. Requires contentType "html"; the content must contain <at id="N">displayName</at> for each entry, where N is the entry\'s position in this list starting at 0.'
  );

export let importanceInputSchema = z
  .enum(['normal', 'high', 'urgent'])
  .optional()
  .describe('Message importance. Defaults to normal.');

export let pageTokenInputSchema = z
  .string()
  .optional()
  .describe('nextPageToken from a previous call, to fetch the next page of results');

export let pageSizeInputSchema = z
  .number()
  .int()
  .min(1)
  .max(50)
  .optional()
  .describe('Maximum number of items per page (1-50)');

export type MentionInput = NonNullable<z.infer<typeof mentionsInputSchema>>[number];

// https://learn.microsoft.com/en-us/graph/api/chatmessage-post?view=graph-rest-1.0#example-2-create-a-message-with-at-mentions
export let buildMessagePayload = (input: {
  content: string;
  contentType: 'text' | 'html';
  mentions?: MentionInput[];
  subject?: string;
  importance?: 'normal' | 'high' | 'urgent';
}) => {
  let mentions = input.mentions ?? [];
  if (mentions.length > 0) {
    if (input.contentType !== 'html') {
      throw createApiServiceError(
        'Mentions require contentType "html" with an <at id="N">Name</at> tag for each mention.',
        { reason: 'microsoft_teams_mentions_require_html' }
      );
    }
    let missing = mentions
      .map((_, index) => index)
      .filter(
        index => !new RegExp(`<at\\s+id=["']?${index}["']?\\s*>`, 'i').test(input.content)
      );
    if (missing.length > 0) {
      throw createApiServiceError(
        `The content is missing mention tags for mentions ${missing.join(', ')}. Add <at id="N">displayName</at> for each mention, where N is its position in the mentions list.`,
        { reason: 'microsoft_teams_mention_tag_missing' }
      );
    }
  }

  return {
    body: { contentType: input.contentType, content: input.content },
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.importance ? { importance: input.importance } : {}),
    ...(mentions.length > 0
      ? {
          mentions: mentions.map((mention, index) => ({
            id: index,
            mentionText: mention.displayName,
            mentioned: {
              user: {
                id: mention.userId,
                displayName: mention.displayName,
                userIdentityType: 'aadUser'
              }
            }
          }))
        }
      : {})
  };
};

// Senders are users, bots/apps, or absent for system event messages.
// https://learn.microsoft.com/en-us/graph/api/resources/chatmessagefromidentityset?view=graph-rest-1.0
export let mapGraphMessage = (message: any) => {
  let user = message?.from?.user;
  let application = message?.from?.application;
  return {
    messageId: message.id,
    content: message.body?.content || null,
    contentType: message.body?.contentType,
    createdDateTime: message.createdDateTime,
    senderDisplayName: user?.displayName || application?.displayName || null,
    senderUserId: user?.id || null,
    ...(application?.id ? { senderApplicationId: application.id } : {}),
    ...(message.messageType ? { messageType: message.messageType } : {}),
    ...(message.subject ? { subject: message.subject } : {}),
    ...(message.replyToId ? { replyToId: message.replyToId } : {}),
    ...(message.lastEditedDateTime ? { lastEditedDateTime: message.lastEditedDateTime } : {}),
    ...(message.deletedDateTime ? { deletedDateTime: message.deletedDateTime } : {}),
    ...(typeof message.webUrl === 'string' && message.webUrl ? { webUrl: message.webUrl } : {})
  };
};

export let graphMessageOutputFields = {
  messageId: z.string().describe('Unique identifier of the message'),
  content: z.string().nullable().describe('Message body content'),
  contentType: z.string().optional().describe('Content type (text or html)'),
  createdDateTime: z.string().describe('When the message was created'),
  senderDisplayName: z.string().nullable().describe('Display name of the sending user or app'),
  senderUserId: z.string().nullable().describe('User ID of the sender, when a user sent it'),
  senderApplicationId: z
    .string()
    .optional()
    .describe('App ID of the sender, when a bot or app sent it'),
  messageType: z
    .string()
    .optional()
    .describe('Message type, such as message or systemEventMessage'),
  subject: z.string().optional().describe('Subject of a channel post'),
  replyToId: z.string().optional().describe('ID of the parent message for channel replies'),
  lastEditedDateTime: z.string().optional().describe('When the message was last edited'),
  deletedDateTime: z.string().optional().describe('When the message was deleted'),
  webUrl: z.string().optional().describe('URL to the message in Teams')
};
