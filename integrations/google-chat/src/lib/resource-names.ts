import { googleChatValidationError } from './errors';

let segmentPattern = '[^/\\s?#]+';

let resolveSegment = (value: string | undefined, label: string) => {
  let resolved = value?.trim();
  if (!resolved) {
    throw googleChatValidationError(`${label} is required.`);
  }
  if (resolved.includes('/') || /[\s?#]/.test(resolved)) {
    throw googleChatValidationError(
      `${label} must be an ID without slashes, whitespace, query text, or fragments.`
    );
  }
  return resolved;
};

let resolveChildResourceName = (
  value: string | undefined,
  parent: string | undefined,
  collection: 'messages' | 'members' | 'reactions' | 'attachments' | 'spaceEvents',
  parentResolver: (value: string | undefined) => string,
  canonicalPattern: RegExp,
  label: string
) => {
  let resolved = value?.trim();
  if (!resolved) throw googleChatValidationError(`${label} is required.`);
  if (canonicalPattern.test(resolved)) return resolved;

  let id = resolveSegment(resolved, `${label} ID`);
  return `${parentResolver(parent)}/${collection}/${id}`;
};

let resolveTopLevelResourceName = (
  value: string | undefined,
  collection: 'groups' | 'users',
  label: string
) => {
  let resolved = value?.trim();
  if (!resolved) throw googleChatValidationError(`${label} is required.`);
  if (new RegExp(`^${collection}/${segmentPattern}$`).test(resolved)) return resolved;
  return `${collection}/${resolveSegment(resolved, `${label} ID`)}`;
};

export let resolveGoogleChatSpaceName = (space: string | undefined, defaultSpace?: string) => {
  let resolved = space?.trim() || defaultSpace?.trim();
  if (!resolved) {
    throw googleChatValidationError(
      'A Google Chat space is required. Provide a space in the tool input or configure defaultSpace.'
    );
  }
  if (new RegExp(`^spaces/${segmentPattern}$`).test(resolved)) return resolved;
  return `spaces/${resolveSegment(resolved, 'Google Chat space ID')}`;
};

export let resolveGoogleChatUserName = (user: string | undefined) =>
  resolveTopLevelResourceName(user, 'users', 'Google Chat user');

export let resolveGoogleChatGroupName = (group: string | undefined) =>
  resolveTopLevelResourceName(group, 'groups', 'Google Chat group');

export let resolveGoogleChatMessageName = (message: string | undefined, space?: string) =>
  resolveChildResourceName(
    message,
    space,
    'messages',
    resolveGoogleChatSpaceName,
    new RegExp(`^spaces/${segmentPattern}/messages/${segmentPattern}$`),
    'Google Chat message'
  );

export let resolveGoogleChatThreadName = (threadId: string | undefined, parent: string) => {
  let resolved = threadId?.trim();
  if (!resolved) return undefined;

  if (new RegExp(`^spaces/${segmentPattern}/threads/${segmentPattern}$`).test(resolved)) {
    if (!resolved.startsWith(`${parent}/threads/`)) {
      throw googleChatValidationError(
        'threadId must belong to the same conversation as conversationId.'
      );
    }
    return resolved;
  }

  if (resolved.includes('/') || /[\s?#]/.test(resolved)) {
    throw googleChatValidationError(
      'threadId must be a thread ID or a resource name in spaces/{space}/threads/{thread} format.'
    );
  }
  return `${parent}/threads/${resolved}`;
};

export let resolveGoogleChatMembershipName = (
  membership: string | undefined,
  space?: string
) =>
  resolveChildResourceName(
    membership,
    space,
    'members',
    resolveGoogleChatSpaceName,
    new RegExp(`^spaces/${segmentPattern}/members/${segmentPattern}$`),
    'Google Chat membership'
  );

export let resolveGoogleChatReactionName = (reaction: string | undefined, message?: string) =>
  resolveChildResourceName(
    reaction,
    message,
    'reactions',
    value => resolveGoogleChatMessageName(value),
    new RegExp(
      `^spaces/${segmentPattern}/messages/${segmentPattern}/reactions/${segmentPattern}$`
    ),
    'Google Chat reaction'
  );

export let resolveGoogleChatAttachmentName = (
  attachment: string | undefined,
  message?: string
) =>
  resolveChildResourceName(
    attachment,
    message,
    'attachments',
    value => resolveGoogleChatMessageName(value),
    new RegExp(
      `^spaces/${segmentPattern}/messages/${segmentPattern}/attachments/${segmentPattern}$`
    ),
    'Google Chat attachment'
  );

export let resolveGoogleChatSpaceEventName = (event: string | undefined, space?: string) =>
  resolveChildResourceName(
    event,
    space,
    'spaceEvents',
    resolveGoogleChatSpaceName,
    new RegExp(`^spaces/${segmentPattern}/spaceEvents/${segmentPattern}$`),
    'Google Chat space event'
  );
