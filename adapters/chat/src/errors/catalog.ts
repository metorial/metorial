/**
 * Chat adapter error catalog.
 *
 * This table is the single source of truth for chat error codes. Adding a code
 * here widens `ChatErrorCode`, gives the factories a default slates mapping and
 * message, and makes the code available to `parseChatError` consumers.
 *
 * `slate` is the slates code used when a chat error is raised without an
 * underlying error to inherit from. When wrapping an existing `SlateError` the
 * wrapped error's own slates fields win — see `wrapChatError`.
 */

export type ChatErrorCategory =
  | 'auth'
  | 'target'
  | 'access'
  | 'content'
  | 'attachment'
  | 'conflict'
  | 'interaction'
  | 'rate_limit'
  | 'provider'
  | 'capability'
  | 'input'
  | 'event';

export type ChatErrorTargetType =
  | 'workspace'
  | 'channel'
  | 'thread'
  | 'message'
  | 'user'
  | 'attachment'
  | 'reaction'
  | 'modal'
  | 'command';

export interface ChatErrorTarget {
  type: ChatErrorTargetType;
  id?: string;
}

export interface ChatErrorLimit {
  /** What the limit applies to, e.g. `message_length` or `attachment_bytes`. */
  name: string;
  max: number;
  actual?: number;
}

export interface ChatErrorProviderInfo {
  /** Raw provider error code, e.g. Slack's `channel_not_found`. */
  code?: string;
  message?: string;
}

export interface ChatErrorDeclaration {
  /** Slates code used when there is no wrapped error to inherit from. */
  slate: string;
  category: ChatErrorCategory;
  message: string;
  retryable: boolean;
  /** Default target type, applied when a call site passes a bare target id. */
  target?: ChatErrorTargetType;
}

let declare = <const T extends Record<string, ChatErrorDeclaration>>(catalog: T) => catalog;

export let chatErrorCatalog = declare({
  /**
   * Authentication and installation. Applies to every tool.
   */
  'chat.auth.invalid': {
    slate: 'auth.invalid',
    category: 'auth',
    retryable: false,
    message: 'The chat provider rejected the credentials for this connection.'
  },
  'chat.auth.expired': {
    slate: 'auth.expired',
    category: 'auth',
    retryable: false,
    message: 'The credentials for this chat connection have expired.'
  },
  'chat.auth.missing_scope': {
    slate: 'permission.denied',
    category: 'auth',
    retryable: false,
    message: 'The chat app is missing an OAuth scope required for this operation.'
  },
  'chat.auth.user_token_required': {
    slate: 'permission.denied',
    category: 'auth',
    retryable: false,
    message: 'This operation requires a user token, but only an app token is available.'
  },
  'chat.auth.app_not_installed': {
    slate: 'auth.required',
    category: 'auth',
    retryable: false,
    message: 'The chat app is not installed in this workspace.'
  },

  /**
   * Target resolution.
   */
  'chat.channel.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'channel',
    message: 'The channel does not exist or the chat app cannot see it.'
  },
  'chat.message.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'message',
    message: 'The message does not exist or is no longer visible to the chat app.'
  },
  'chat.thread.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'thread',
    message: 'The thread does not exist or is no longer visible to the chat app.'
  },
  'chat.user.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'user',
    message: 'The user does not exist or is not visible to the chat app.'
  },
  'chat.workspace.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'workspace',
    message: 'The workspace is not connected to this chat integration.'
  },
  'chat.attachment.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'attachment',
    message: 'The attachment does not exist or has been deleted.'
  },
  'chat.emoji.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'reaction',
    message: 'The emoji is not available in this workspace.'
  },
  'chat.command.not_found': {
    slate: 'resource.not_found',
    category: 'target',
    retryable: false,
    target: 'command',
    message: 'The slash command is not registered for this chat app.'
  },

  /**
   * Access and membership.
   */
  'chat.access.not_a_member': {
    slate: 'permission.denied',
    category: 'access',
    retryable: false,
    target: 'channel',
    message: 'The chat app is not a member of this channel.'
  },
  'chat.access.forbidden': {
    slate: 'permission.denied',
    category: 'access',
    retryable: false,
    message: 'The chat provider refused this operation for the current app.'
  },
  'chat.access.channel_archived': {
    slate: 'resource.conflict',
    category: 'access',
    retryable: false,
    target: 'channel',
    message: 'The channel is archived and cannot be modified.'
  },
  'chat.access.dm_not_allowed': {
    slate: 'permission.denied',
    category: 'access',
    retryable: false,
    target: 'user',
    message: 'Direct messages to this user are not allowed.'
  },

  /**
   * Message content.
   */
  'chat.content.empty': {
    slate: 'input.invalid',
    category: 'content',
    retryable: false,
    message: 'The message body has no renderable content.'
  },
  'chat.content.too_long': {
    slate: 'input.invalid',
    category: 'content',
    retryable: false,
    message: 'The message exceeds the length the chat provider accepts.'
  },
  'chat.content.invalid_blocks': {
    slate: 'upstream.invalid_request',
    category: 'content',
    retryable: false,
    message: 'The chat provider rejected the rendered message content.'
  },
  'chat.content.unsupported_block': {
    slate: 'operation.not_implemented',
    category: 'content',
    retryable: false,
    message: 'The message uses content this chat provider cannot render.'
  },
  'chat.content.markdown_unsupported': {
    slate: 'operation.not_implemented',
    category: 'content',
    retryable: false,
    message: 'The message uses markdown this chat provider cannot represent.'
  },

  /**
   * Attachments.
   */
  'chat.attachment.too_large': {
    slate: 'input.invalid',
    category: 'attachment',
    retryable: false,
    target: 'attachment',
    message: 'The attachment is larger than the chat provider allows.'
  },
  'chat.attachment.unsupported_type': {
    slate: 'input.invalid',
    category: 'attachment',
    retryable: false,
    target: 'attachment',
    message: 'The chat provider does not accept this attachment type.'
  },
  'chat.attachment.upload_failed': {
    slate: 'upstream.error',
    category: 'attachment',
    retryable: true,
    target: 'attachment',
    message: 'The attachment upload did not complete.'
  },
  'chat.attachment.download_failed': {
    slate: 'upstream.error',
    category: 'attachment',
    retryable: true,
    target: 'attachment',
    message: 'The attachment could not be downloaded.'
  },

  /**
   * Mutation conflicts.
   */
  'chat.message.not_editable': {
    slate: 'resource.conflict',
    category: 'conflict',
    retryable: false,
    target: 'message',
    message: 'The message cannot be edited.'
  },
  'chat.message.not_deletable': {
    slate: 'resource.conflict',
    category: 'conflict',
    retryable: false,
    target: 'message',
    message: 'The message cannot be deleted.'
  },
  'chat.message.duplicate': {
    slate: 'resource.conflict',
    category: 'conflict',
    retryable: false,
    target: 'message',
    message: 'An equivalent message already exists.'
  },
  'chat.reaction.already_exists': {
    slate: 'resource.conflict',
    category: 'conflict',
    retryable: false,
    target: 'reaction',
    message: 'The reaction has already been added to this message.'
  },
  'chat.reaction.not_found': {
    slate: 'resource.not_found',
    category: 'conflict',
    retryable: false,
    target: 'reaction',
    message: 'The reaction is not present on this message.'
  },
  'chat.reaction.limit_reached': {
    slate: 'resource.conflict',
    category: 'conflict',
    retryable: false,
    target: 'reaction',
    message: 'The message has reached the maximum number of reactions.'
  },

  /**
   * Interactions: modals, actions and slash commands.
   */
  'chat.interaction.trigger_expired': {
    slate: 'request.precondition_failed',
    category: 'interaction',
    retryable: false,
    target: 'modal',
    message: 'The interaction trigger has expired or was already used.'
  },
  'chat.interaction.trigger_invalid': {
    slate: 'input.invalid',
    category: 'interaction',
    retryable: false,
    target: 'modal',
    message: 'The interaction trigger is not valid.'
  },
  'chat.interaction.modal_invalid': {
    slate: 'upstream.invalid_request',
    category: 'interaction',
    retryable: false,
    target: 'modal',
    message: 'The chat provider rejected the modal definition.'
  },
  'chat.interaction.modal_not_found': {
    slate: 'resource.not_found',
    category: 'interaction',
    retryable: false,
    target: 'modal',
    message: 'The modal no longer exists.'
  },
  'chat.interaction.response_expired': {
    slate: 'request.precondition_failed',
    category: 'interaction',
    retryable: false,
    target: 'command',
    message: 'The window for responding to this interaction has closed.'
  },

  /**
   * Rate limiting and provider availability. All retryable.
   */
  'chat.rate_limit.exceeded': {
    slate: 'upstream.rate_limited',
    category: 'rate_limit',
    retryable: true,
    message: 'The chat provider rate limited the request.'
  },
  'chat.provider.unavailable': {
    slate: 'upstream.unavailable',
    category: 'provider',
    retryable: true,
    message: 'The chat provider is temporarily unavailable.'
  },
  'chat.provider.timeout': {
    slate: 'upstream.timeout',
    category: 'provider',
    retryable: true,
    message: 'The chat provider did not respond in time.'
  },
  'chat.provider.network_error': {
    slate: 'upstream.network_error',
    category: 'provider',
    retryable: true,
    message: 'A network error occurred while contacting the chat provider.'
  },
  'chat.provider.error': {
    slate: 'upstream.error',
    category: 'provider',
    retryable: false,
    message: 'The chat provider returned an error.'
  },

  /**
   * Capability and input.
   */
  'chat.capability.unsupported': {
    slate: 'operation.not_implemented',
    category: 'capability',
    retryable: false,
    message: 'This chat provider does not support the requested operation.'
  },
  'chat.input.invalid': {
    slate: 'input.invalid',
    category: 'input',
    retryable: false,
    message: 'The input for this chat operation is invalid.'
  },
  'chat.input.missing_target': {
    slate: 'input.invalid',
    category: 'input',
    retryable: false,
    message: 'The input is missing an identifier required to locate the target.'
  },
  'chat.input.cursor_invalid': {
    slate: 'input.invalid',
    category: 'input',
    retryable: false,
    message: 'The pagination cursor is not valid for this chat provider.'
  },

  /**
   * Inbound events: webhook handling and trigger mapping.
   */
  'chat.event.signature_invalid': {
    slate: 'auth.invalid',
    category: 'event',
    retryable: false,
    message: 'The inbound event signature could not be verified.'
  },
  'chat.event.payload_unrecognized': {
    slate: 'input.invalid',
    category: 'event',
    retryable: false,
    message: 'The inbound event is not one this chat adapter maps.'
  },
  'chat.event.payload_incomplete': {
    slate: 'upstream.invalid_response',
    category: 'event',
    retryable: false,
    message: 'The inbound event is missing fields required to map it.'
  },
  'chat.event.hydration_failed': {
    slate: 'upstream.error',
    category: 'event',
    retryable: true,
    message: 'The inbound event could not be hydrated from the chat provider.'
  },
  'chat.event.replay_rejected': {
    slate: 'request.precondition_failed',
    category: 'event',
    retryable: false,
    message: 'The inbound event was redelivered outside the accepted window.'
  }
});

export type ChatErrorCatalog = typeof chatErrorCatalog;

export type ChatErrorCode = keyof ChatErrorCatalog;

export let chatErrorCodes = Object.keys(chatErrorCatalog) as ChatErrorCode[];

export let isChatErrorCodeKnown = (value: unknown): value is ChatErrorCode =>
  typeof value === 'string' && value in chatErrorCatalog;

export let getChatErrorDeclaration = (code: ChatErrorCode): ChatErrorDeclaration =>
  chatErrorCatalog[code];

/**
 * The entity a code points at, or undefined when it is not about one entity.
 * Lets a provider mapper pick the right id from its context without duplicating
 * the catalog.
 */
export let getChatErrorTargetType = (code: ChatErrorCode): ChatErrorTargetType | undefined =>
  getChatErrorDeclaration(code).target;
