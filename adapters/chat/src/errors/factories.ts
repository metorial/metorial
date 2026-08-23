import type { ChatErrorCode } from './catalog';
import { type ChatError, chatError, wrapChatError } from './error';
import type { ChatErrorDetailsInput } from './types';

/**
 * Named helpers for the chat errors raised most often, so call sites read as
 * prose and the structured fields are hard to forget.
 *
 * Anything not covered here is still reachable through `chatError(code, ...)`
 * and `wrapChatError(code, cause, ...)`.
 */

/** Shared options. `target` is set by each helper from its own id field. */
type Details = Omit<ChatErrorDetailsInput, 'target'>;

let raise = (
  code: ChatErrorCode,
  details: ChatErrorDetailsInput,
  cause: unknown
): ChatError =>
  cause === undefined ? chatError(code, details) : wrapChatError(code, cause, details);

/**
 * Builds a helper whose id field is named after the entity, so a call site reads
 * `channelNotFound({ channelId })`. The declaration's `target` type turns the
 * bare id into a full target.
 */
let targeted =
  <Field extends string>(code: ChatErrorCode, field: Field) =>
  (input: Details & Partial<Record<Field, string>> = {}) => {
    let { [field]: id, cause, ...rest } = input as Details & Record<Field, string | undefined>;
    return raise(code, { ...rest, target: id }, cause);
  };

let plain =
  (code: ChatErrorCode) =>
  (input: Details = {}) => {
    let { cause, ...rest } = input;
    return raise(code, rest, cause);
  };

let limited =
  (code: ChatErrorCode, limitName: string) =>
  (input: Details & { max?: number; actual?: number; id?: string } = {}) => {
    let { cause, max, actual, id, ...rest } = input;
    return raise(
      code,
      {
        ...rest,
        target: id,
        limit: max === undefined ? undefined : { name: limitName, max, actual }
      },
      cause
    );
  };

export let ChatErrors = {
  /** Auth */
  authInvalid: plain('chat.auth.invalid'),
  authExpired: plain('chat.auth.expired'),
  missingScope: (input: Details & { scopes?: string[] } = {}) => {
    let { cause, ...rest } = input;
    return raise('chat.auth.missing_scope', rest, cause);
  },
  userTokenRequired: plain('chat.auth.user_token_required'),
  appNotInstalled: plain('chat.auth.app_not_installed'),

  /** Targets */
  channelNotFound: targeted('chat.channel.not_found', 'channelId'),
  messageNotFound: targeted('chat.message.not_found', 'messageId'),
  threadNotFound: targeted('chat.thread.not_found', 'threadId'),
  userNotFound: targeted('chat.user.not_found', 'userId'),
  workspaceNotFound: targeted('chat.workspace.not_found', 'workspaceId'),
  attachmentNotFound: targeted('chat.attachment.not_found', 'attachmentId'),
  emojiNotFound: targeted('chat.emoji.not_found', 'emoji'),
  commandNotFound: targeted('chat.command.not_found', 'command'),

  /** Access */
  notAMember: targeted('chat.access.not_a_member', 'channelId'),
  accessForbidden: plain('chat.access.forbidden'),
  channelArchived: targeted('chat.access.channel_archived', 'channelId'),
  dmNotAllowed: targeted('chat.access.dm_not_allowed', 'userId'),

  /** Content */
  contentEmpty: plain('chat.content.empty'),
  contentTooLong: limited('chat.content.too_long', 'message_length'),
  invalidBlocks: plain('chat.content.invalid_blocks'),
  unsupportedBlock: plain('chat.content.unsupported_block'),
  markdownUnsupported: plain('chat.content.markdown_unsupported'),

  /** Attachments */
  attachmentTooLarge: limited('chat.attachment.too_large', 'attachment_bytes'),
  attachmentUnsupportedType: targeted('chat.attachment.unsupported_type', 'attachmentId'),
  attachmentUploadFailed: targeted('chat.attachment.upload_failed', 'attachmentId'),
  attachmentDownloadFailed: targeted('chat.attachment.download_failed', 'attachmentId'),

  /** Conflicts */
  messageNotEditable: targeted('chat.message.not_editable', 'messageId'),
  messageNotDeletable: targeted('chat.message.not_deletable', 'messageId'),
  messageDuplicate: targeted('chat.message.duplicate', 'messageId'),
  reactionAlreadyExists: targeted('chat.reaction.already_exists', 'emoji'),
  reactionNotFound: targeted('chat.reaction.not_found', 'emoji'),
  reactionLimitReached: targeted('chat.reaction.limit_reached', 'messageId'),

  /** Interactions */
  triggerExpired: targeted('chat.interaction.trigger_expired', 'triggerId'),
  triggerInvalid: targeted('chat.interaction.trigger_invalid', 'triggerId'),
  modalInvalid: plain('chat.interaction.modal_invalid'),
  modalNotFound: targeted('chat.interaction.modal_not_found', 'viewId'),
  responseExpired: plain('chat.interaction.response_expired'),

  /** Rate limiting and availability */
  rateLimited: (input: Details & { retryAfterMs?: number } = {}) => {
    let { cause, ...rest } = input;
    return raise('chat.rate_limit.exceeded', rest, cause);
  },
  providerUnavailable: plain('chat.provider.unavailable'),
  providerTimeout: plain('chat.provider.timeout'),
  providerNetworkError: plain('chat.provider.network_error'),
  providerError: plain('chat.provider.error'),

  /** Capability and input */
  capabilityUnsupported: (input: Details & { capability?: string } = {}) => {
    let { cause, ...rest } = input;
    return raise('chat.capability.unsupported', rest, cause);
  },
  inputInvalid: plain('chat.input.invalid'),
  missingTarget: plain('chat.input.missing_target'),
  cursorInvalid: plain('chat.input.cursor_invalid'),

  /** Inbound events */
  eventSignatureInvalid: plain('chat.event.signature_invalid'),
  eventUnrecognized: plain('chat.event.payload_unrecognized'),
  eventIncomplete: plain('chat.event.payload_incomplete'),
  eventHydrationFailed: plain('chat.event.hydration_failed'),
  eventReplayRejected: plain('chat.event.replay_rejected')
};
