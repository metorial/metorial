import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatMessageName,
  resolveGoogleChatReactionName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export type GoogleChatReaction = {
  name?: string;
  user?: {
    name?: string;
    displayName?: string;
    type?: string;
  };
  emoji?: {
    unicode?: string;
    customEmoji?: {
      name?: string;
      uid?: string;
      emojiName?: string;
    };
  };
};

let googleChatReactionOutputSchema = z.object({
  reactionName: z.string().describe('Full Google Chat reaction resource name'),
  emoji: z
    .string()
    .optional()
    .describe('Unicode emoji or custom emoji name, resource name, or stable UID'),
  userName: z.string().optional().describe('Resource name of the user who reacted'),
  userDisplayName: z.string().optional().describe('Display name of the user who reacted'),
  userType: z.string().optional().describe('Google Chat user type')
});

export let mapGoogleChatReaction = (reaction: GoogleChatReaction) => {
  let reactionName = reaction.name?.trim();
  if (!reactionName) {
    throw googleChatValidationError(
      'Google Chat returned a reaction without its required resource name.'
    );
  }

  return {
    reactionName,
    emoji:
      reaction.emoji?.unicode ??
      reaction.emoji?.customEmoji?.emojiName ??
      reaction.emoji?.customEmoji?.name ??
      reaction.emoji?.customEmoji?.uid,
    userName: reaction.user?.name,
    userDisplayName: reaction.user?.displayName,
    userType: reaction.user?.type
  };
};

export type ManageReactionInput = {
  action: 'create' | 'list' | 'delete';
  message?: string;
  space?: string;
  reaction?: string;
  emoji?: string;
  filter?: string;
  pageSize?: number;
  pageToken?: string;
};

export type ManageReactionRequest = {
  action: ManageReactionInput['action'];
  path: string;
  method: 'delete' | 'get' | 'post';
  params?: Record<string, unknown>;
  data?: unknown;
  reactionName?: string;
};

export let buildManageReactionRequest = (
  input: ManageReactionInput,
  defaultSpace?: string
): ManageReactionRequest => {
  if (input.action === 'delete') {
    if (
      input.emoji !== undefined ||
      input.filter !== undefined ||
      input.pageSize !== undefined ||
      input.pageToken !== undefined
    ) {
      throw googleChatValidationError(
        'emoji, filter, pageSize, and pageToken are not supported when action is delete.'
      );
    }
    let messageName = input.message
      ? resolveGoogleChatMessageName(input.message, input.space ?? defaultSpace)
      : undefined;
    let reactionName = resolveGoogleChatReactionName(input.reaction, messageName);
    if (messageName && !reactionName.startsWith(`${messageName}/reactions/`)) {
      throw googleChatValidationError(
        'reaction must belong to the message supplied for the delete action.'
      );
    }
    return {
      action: input.action,
      path: reactionName,
      method: 'delete',
      reactionName
    };
  }

  if (input.reaction !== undefined) {
    throw googleChatValidationError(
      `reaction is supported only when action is delete, not ${input.action}.`
    );
  }
  let messageName = resolveGoogleChatMessageName(input.message, input.space ?? defaultSpace);

  if (input.action === 'create') {
    if (
      input.filter !== undefined ||
      input.pageSize !== undefined ||
      input.pageToken !== undefined
    ) {
      throw googleChatValidationError(
        'filter, pageSize, and pageToken are supported only when action is list.'
      );
    }
    let emoji = input.emoji?.trim();
    if (!emoji) {
      throw googleChatValidationError('emoji is required when action is create.');
    }
    return {
      action: input.action,
      path: `${messageName}/reactions`,
      method: 'post',
      data: { emoji: { unicode: emoji } }
    };
  }

  if (input.emoji !== undefined) {
    throw googleChatValidationError('emoji is supported only when action is create.');
  }
  return {
    action: input.action,
    path: `${messageName}/reactions`,
    method: 'get',
    params: pickDefined({
      filter: input.filter,
      pageSize: input.pageSize,
      pageToken: input.pageToken
    })
  };
};

export let manageReaction = SlateTool.create(spec, {
  name: 'Manage Reaction',
  key: 'manage_reaction',
  description:
    'Create Unicode emoji reactions, or list and delete emoji reactions on Google Chat messages.',
  instructions: [
    'Use **action** "create" to add a Unicode emoji reaction to a message; requires **message** and **emoji**.',
    'Use **action** "list" to page through the reactions on a message with an optional filter; requires **message**.',
    'Use **action** "delete" to remove a reaction by **reaction** ID or full resource name.'
  ],
  constraints: ['Deleting a reaction is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.manageReaction)
  .authMethods(googleChatActionAuthMethods.manageReaction)
  .input(
    z.object({
      action: z.enum(['create', 'list', 'delete']).describe('Reaction operation to perform'),
      message: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Message ID or spaces/{space}/messages/{message} resource name; required for create/list and bare reaction IDs'
        ),
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Space ID or resource name for bare message IDs; defaults to defaultSpace'),
      reaction: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Reaction ID or full spaces/{space}/messages/{message}/reactions/{reaction} name for delete'
        ),
      emoji: z.string().trim().min(1).optional().describe('Unicode emoji for action=create'),
      filter: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Google Chat reaction filter for action=list'),
      pageSize: z
        .number()
        .int()
        .positive()
        .max(200)
        .optional()
        .describe('Maximum reactions to return for action=list'),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Pagination token for action=list')
    })
  )
  .output(
    z.object({
      action: z.enum(['create', 'list', 'delete']).describe('Completed operation'),
      reactionName: z.string().optional().describe('Full resource name for a single reaction'),
      reaction: googleChatReactionOutputSchema
        .optional()
        .describe('Reaction returned by action=create'),
      reactions: z
        .array(googleChatReactionOutputSchema)
        .optional()
        .describe('Reactions returned by action=list'),
      nextPageToken: z.string().optional().describe('Token for the next page of reactions'),
      deleted: z.boolean().optional().describe('True when the reaction was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildManageReactionRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);

    if (request.action === 'delete') {
      await client.request<Record<string, never>>(request.path, {
        method: request.method,
        operation: 'delete reaction'
      });
      return {
        output: {
          action: request.action,
          reactionName: request.reactionName,
          deleted: true
        },
        message: `Deleted reaction \`${request.reactionName}\`.`
      };
    }

    if (request.action === 'list') {
      let response = await client.request<{
        reactions?: GoogleChatReaction[];
        nextPageToken?: string;
      }>(request.path, {
        method: request.method,
        params: request.params,
        operation: 'list reactions'
      });
      let reactions = (response.reactions ?? []).map(mapGoogleChatReaction);
      return {
        output: {
          action: request.action,
          reactions,
          nextPageToken: response.nextPageToken
        },
        message: `Found **${reactions.length}** reaction(s).`
      };
    }

    let response = await client.request<GoogleChatReaction>(request.path, {
      method: request.method,
      data: request.data,
      operation: 'create reaction'
    });
    let reaction = mapGoogleChatReaction(response);
    return {
      output: {
        action: request.action,
        reactionName: reaction.reactionName,
        reaction
      },
      message: `Created reaction \`${reaction.reactionName}\`.`
    };
  })
  .build();
