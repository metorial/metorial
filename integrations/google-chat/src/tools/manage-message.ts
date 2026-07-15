import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import { resolveGoogleChatMessageName } from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  type GoogleChatMessage,
  googleChatMessageOutputSchema,
  mapGoogleChatMessage
} from './send-message';

export type ManageMessageInput = {
  action: 'get' | 'update' | 'delete';
  message: string;
  space?: string;
  text?: string;
  updateMask?: 'text';
  force?: boolean;
};

export type ManageMessageRequest =
  | {
      action: 'get';
      messageName: string;
      method: 'get';
    }
  | {
      action: 'update';
      messageName: string;
      method: 'patch';
      params: { updateMask: 'text' };
      data: { name: string; text: string };
    }
  | {
      action: 'delete';
      messageName: string;
      method: 'delete';
      params: Record<string, unknown>;
    };

export let buildManageMessageRequest = (
  input: ManageMessageInput,
  defaultSpace?: string
): ManageMessageRequest => {
  let messageName = resolveGoogleChatMessageName(input.message, input.space ?? defaultSpace);

  if (input.action === 'get') {
    if (
      input.text !== undefined ||
      input.updateMask !== undefined ||
      input.force !== undefined
    ) {
      throw googleChatValidationError(
        'text, updateMask, and force are not supported when action is get.'
      );
    }
    return { action: 'get', messageName, method: 'get' };
  }

  if (input.action === 'update') {
    if (input.text === undefined || input.text.length === 0) {
      throw googleChatValidationError('text is required when action is update.');
    }
    if (input.force !== undefined) {
      throw googleChatValidationError('force is supported only when action is delete.');
    }
    return {
      action: 'update',
      messageName,
      method: 'patch',
      params: { updateMask: input.updateMask ?? 'text' },
      data: { name: messageName, text: input.text }
    };
  }

  if (input.text !== undefined || input.updateMask !== undefined) {
    throw googleChatValidationError(
      'text and updateMask are supported only when action is update.'
    );
  }
  return {
    action: 'delete',
    messageName,
    method: 'delete',
    params: pickDefined({ force: input.force })
  };
};

export let manageMessage = SlateTool.create(spec, {
  name: 'Manage Message',
  key: 'manage_message',
  description:
    'Get, update, or delete a Google Chat message. Updates use messages.patch with an explicit text update mask, so only the plain text body can be changed.',
  instructions: [
    'Use **action** "get" to retrieve one message; the read-only chat.messages.readonly scope is sufficient.',
    'Use **action** "update" to replace the message text. Requires **text** and the chat.messages scope. Only the text body can be updated; cards and attachments are not supported by this tool.',
    'Use **action** "delete" to delete a message. Requires the chat.messages scope. Set force=true to also delete threaded replies with user authentication.'
  ],
  constraints: [
    'With Chat app authentication, update and delete can act only on messages created by the calling app.',
    'Deleting a message is irreversible. Set force=true to also delete threaded replies when using user authentication.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.manageMessage)
  .authMethods(googleChatActionAuthMethods.manageMessage)
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete']).describe('Message operation to perform'),
      message: z
        .string()
        .trim()
        .min(1)
        .describe('Message ID or full spaces/{space}/messages/{message} resource name'),
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Space ID or resource name, required for a bare message ID unless defaultSpace is set'
        ),
      text: z
        .string()
        .min(1)
        .optional()
        .describe('Replacement message text for action=update'),
      updateMask: z
        .literal('text')
        .optional()
        .describe('Field mask for action=update; defaults to text'),
      force: z
        .boolean()
        .optional()
        .describe('For action=delete, also delete threaded replies when user-authenticated')
    })
  )
  .output(
    z.object({
      action: z.enum(['get', 'update', 'delete']).describe('Completed operation'),
      messageName: z.string().describe('Full resource name of the target message'),
      message: googleChatMessageOutputSchema
        .optional()
        .describe('Retrieved or updated message'),
      deleted: z.boolean().optional().describe('True when the message was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildManageMessageRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);

    if (request.action === 'delete') {
      await client.request<Record<string, never>>(request.messageName, {
        method: request.method,
        params: request.params,
        operation: 'delete message'
      });
      return {
        output: {
          action: request.action,
          messageName: request.messageName,
          deleted: true
        },
        message: `Deleted message \`${request.messageName}\`.`
      };
    }

    let response = await client.request<GoogleChatMessage>(request.messageName, {
      method: request.method,
      ...(request.action === 'update'
        ? { params: request.params, data: request.data, operation: 'update message' }
        : { operation: 'get message' })
    });
    let message = mapGoogleChatMessage(response);

    return {
      output: {
        action: request.action,
        messageName: request.messageName,
        message
      },
      message:
        request.action === 'update'
          ? `Updated message \`${request.messageName}\`.`
          : `Retrieved message \`${request.messageName}\`.`
    };
  })
  .build();
