import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  resolveGoogleChatAttachmentName,
  resolveGoogleChatGroupName,
  resolveGoogleChatMembershipName,
  resolveGoogleChatMessageName,
  resolveGoogleChatReactionName,
  resolveGoogleChatSpaceEventName,
  resolveGoogleChatSpaceName,
  resolveGoogleChatThreadName,
  resolveGoogleChatUserName
} from './resource-names';

describe('Google Chat resource names', () => {
  it('resolves space IDs, canonical names, and the configured fallback', () => {
    expect(resolveGoogleChatSpaceName('AAAA')).toBe('spaces/AAAA');
    expect(resolveGoogleChatSpaceName('spaces/AAAA')).toBe('spaces/AAAA');
    expect(resolveGoogleChatSpaceName(undefined, 'BBBB')).toBe('spaces/BBBB');
  });

  it('resolves child resource IDs from canonical parents', () => {
    expect(resolveGoogleChatMessageName('message-1', 'spaces/AAAA')).toBe(
      'spaces/AAAA/messages/message-1'
    );
    expect(resolveGoogleChatMembershipName('member-1', 'AAAA')).toBe(
      'spaces/AAAA/members/member-1'
    );
    expect(resolveGoogleChatReactionName('reaction-1', 'spaces/AAAA/messages/message-1')).toBe(
      'spaces/AAAA/messages/message-1/reactions/reaction-1'
    );
    expect(
      resolveGoogleChatAttachmentName('attachment-1', 'spaces/AAAA/messages/message-1')
    ).toBe('spaces/AAAA/messages/message-1/attachments/attachment-1');
    expect(resolveGoogleChatSpaceEventName('event-1', 'spaces/AAAA')).toBe(
      'spaces/AAAA/spaceEvents/event-1'
    );
  });

  it('resolves thread IDs against their conversation and rejects foreign threads', () => {
    expect(resolveGoogleChatThreadName(undefined, 'spaces/AAAA')).toBeUndefined();
    expect(resolveGoogleChatThreadName('thread-1', 'spaces/AAAA')).toBe(
      'spaces/AAAA/threads/thread-1'
    );
    expect(resolveGoogleChatThreadName('spaces/AAAA/threads/thread-1', 'spaces/AAAA')).toBe(
      'spaces/AAAA/threads/thread-1'
    );
    expect(() =>
      resolveGoogleChatThreadName('spaces/BBBB/threads/thread-1', 'spaces/AAAA')
    ).toThrow(ServiceError);
    expect(() => resolveGoogleChatThreadName('bad/thread', 'spaces/AAAA')).toThrow(
      ServiceError
    );
  });

  it('resolves user and group IDs used by direct messages and memberships', () => {
    expect(resolveGoogleChatUserName('123456789')).toBe('users/123456789');
    expect(resolveGoogleChatUserName('chat-user@example.com')).toBe(
      'users/chat-user@example.com'
    );
    expect(resolveGoogleChatUserName('users/app')).toBe('users/app');
    expect(resolveGoogleChatGroupName('group-123')).toBe('groups/group-123');
    expect(resolveGoogleChatGroupName('groups/group-123')).toBe('groups/group-123');
  });

  it('preserves valid canonical child names', () => {
    expect(resolveGoogleChatMessageName('spaces/AAAA/messages/message-1')).toBe(
      'spaces/AAAA/messages/message-1'
    );
    expect(
      resolveGoogleChatAttachmentName(
        'spaces/AAAA/messages/message-1/attachments/attachment-1'
      )
    ).toBe('spaces/AAAA/messages/message-1/attachments/attachment-1');
  });

  it('rejects missing or malformed names with ServiceError', () => {
    expect(() => resolveGoogleChatSpaceName(undefined)).toThrow(ServiceError);
    expect(() => resolveGoogleChatSpaceName('spaces/AAAA/messages/message-1')).toThrow(
      ServiceError
    );
    expect(() => resolveGoogleChatMessageName('message-1')).toThrow(ServiceError);
    expect(() => resolveGoogleChatMembershipName('bad/id', 'AAAA')).toThrow(ServiceError);
    expect(() => resolveGoogleChatUserName('people/123')).toThrow(ServiceError);
    expect(() => resolveGoogleChatGroupName('groups/group-1/members/member-1')).toThrow(
      ServiceError
    );
  });
});
