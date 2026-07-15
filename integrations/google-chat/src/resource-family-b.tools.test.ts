import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import { expectMcpCompatibleToolSchema } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleChatClient } from './lib/client';
import {
  googleChatActionAuthMethods,
  googleChatActionScopes,
  googleChatScopes
} from './scopes';
import {
  buildDownloadAttachmentRequest,
  downloadAttachment
} from './tools/download-attachment';
import { buildFindDirectMessageRequest, findDirectMessage } from './tools/find-direct-message';
import { buildGetAttachmentRequest, getAttachment } from './tools/get-attachment';
import { buildListSpaceEventsRequest, listSpaceEvents } from './tools/list-space-events';
import { buildManageMemberRequest, manageMember } from './tools/manage-member';
import {
  buildManageReactionRequest,
  manageReaction,
  mapGoogleChatReaction
} from './tools/manage-reaction';
import { buildManageSpaceRequest, manageSpace } from './tools/manage-space';
import { buildUploadAttachmentRequest, uploadAttachment } from './tools/upload-attachment';

let familyBTools = [
  manageSpace,
  manageMember,
  manageReaction,
  findDirectMessage,
  getAttachment,
  downloadAttachment,
  uploadAttachment,
  listSpaceEvents
] as const;

let expectedContracts = [
  {
    tool: manageSpace,
    scopes: googleChatActionScopes.manageSpace,
    authMethods: googleChatActionAuthMethods.manageSpace,
    readOnly: false,
    destructive: true
  },
  {
    tool: manageMember,
    scopes: googleChatActionScopes.manageMember,
    authMethods: googleChatActionAuthMethods.manageMember,
    readOnly: false,
    destructive: true
  },
  {
    tool: manageReaction,
    scopes: googleChatActionScopes.manageReaction,
    authMethods: googleChatActionAuthMethods.manageReaction,
    readOnly: false,
    destructive: true
  },
  {
    tool: findDirectMessage,
    scopes: googleChatActionScopes.findDirectMessage,
    authMethods: googleChatActionAuthMethods.findDirectMessage,
    readOnly: true,
    destructive: false
  },
  {
    tool: getAttachment,
    scopes: googleChatActionScopes.getAttachment,
    authMethods: googleChatActionAuthMethods.getAttachment,
    readOnly: true,
    destructive: false
  },
  {
    tool: downloadAttachment,
    scopes: googleChatActionScopes.downloadAttachment,
    authMethods: googleChatActionAuthMethods.downloadAttachment,
    readOnly: true,
    destructive: false
  },
  {
    tool: uploadAttachment,
    scopes: googleChatActionScopes.uploadAttachment,
    authMethods: googleChatActionAuthMethods.uploadAttachment,
    readOnly: false,
    destructive: false
  },
  {
    tool: listSpaceEvents,
    scopes: googleChatActionScopes.listSpaceEvents,
    authMethods: googleChatActionAuthMethods.listSpaceEvents,
    readOnly: true,
    destructive: false
  }
] as const;

let requestSpy = vi.spyOn(GoogleChatClient.prototype, 'request');

let createContext = <T extends Record<string, unknown>>(input: T) =>
  ({
    input,
    auth: { token: 'test-token' },
    config: { defaultSpace: 'spaces/DEFAULT' },
    progress: vi.fn()
  }) as any;

beforeEach(() => {
  requestSpy.mockReset();
});

describe('google-chat resource tool family B', () => {
  it('exports exact keys with compatible object schemas, scopes, auth methods, and tags', () => {
    expect(familyBTools.map(tool => tool.key)).toEqual([
      'manage_space',
      'manage_member',
      'manage_reaction',
      'find_direct_message',
      'get_attachment',
      'download_attachment',
      'upload_attachment',
      'list_space_events'
    ]);

    for (let contract of expectedContracts) {
      expectMcpCompatibleToolSchema(contract.tool);
      expect(`google-chat-${contract.tool.key}`.length).toBeLessThan(60);
      expect(contract.tool.scopes).toEqual(contract.scopes);
      expect(contract.tool.authMethods).toEqual(contract.authMethods);
      expect(contract.tool.tags?.readOnly).toBe(contract.readOnly);
      expect(contract.tool.tags?.destructive).toBe(contract.destructive);
    }

    expect(JSON.stringify(manageSpace.scopes)).toContain(googleChatScopes.spacesReadonly);
    expect(JSON.stringify(manageSpace.scopes)).not.toContain(googleChatScopes.delete);
    expect(JSON.stringify(manageMember.scopes)).toContain(googleChatScopes.membershipsApp);
    expect(getAttachment.authMethods).toEqual(['service_account']);
    expect(JSON.stringify(getAttachment.scopes)).toContain(googleChatScopes.bot);
    expect(uploadAttachment.authMethods).toEqual(['oauth', 'service_account']);
    expect(JSON.stringify(uploadAttachment.scopes)).toContain(googleChatScopes.bot);
  });

  it('builds all spaces create, setup, get, update, and delete requests', () => {
    expect(
      buildManageSpaceRequest({
        action: 'create',
        spaceType: 'SPACE',
        displayName: 'Engineering',
        requestId: 'c32f2bf5-8a65-4fe0-9cd0-28980c17e590'
      })
    ).toEqual({
      action: 'create',
      path: 'spaces',
      method: 'post',
      params: { requestId: 'c32f2bf5-8a65-4fe0-9cd0-28980c17e590' },
      data: { spaceType: 'SPACE', displayName: 'Engineering' }
    });

    expect(
      buildManageSpaceRequest({
        action: 'setup',
        spaceType: 'GROUP_CHAT',
        initialMembers: [
          { memberType: 'user', member: 'one@example.com' },
          { memberType: 'user', member: 'two@example.com' }
        ]
      })
    ).toEqual({
      action: 'setup',
      path: 'spaces:setup',
      method: 'post',
      data: {
        space: { spaceType: 'GROUP_CHAT' },
        memberships: [
          { member: { name: 'users/one@example.com', type: 'HUMAN' } },
          { member: { name: 'users/two@example.com', type: 'HUMAN' } }
        ]
      }
    });
    expect(
      buildManageSpaceRequest({
        action: 'setup',
        spaceType: 'DIRECT_MESSAGE',
        initialMembers: [{ memberType: 'user', member: 'one@example.com' }]
      })
    ).toMatchObject({
      data: {
        space: { spaceType: 'DIRECT_MESSAGE', singleUserBotDm: false }
      }
    });
    expect(
      buildManageSpaceRequest({
        action: 'setup',
        spaceType: 'SPACE',
        displayName: 'Partners',
        initialMembers: [{ memberType: 'group', member: 'group-1' }]
      })
    ).toMatchObject({
      data: {
        memberships: [{ groupMember: { name: 'groups/group-1' } }]
      }
    });

    expect(buildManageSpaceRequest({ action: 'get', space: 'AAAA' })).toEqual({
      action: 'get',
      path: 'spaces/AAAA',
      method: 'get',
      spaceName: 'spaces/AAAA'
    });
    expect(
      buildManageSpaceRequest({
        action: 'update',
        space: 'AAAA',
        displayName: 'Platform',
        description: 'Platform work',
        guidelines: 'Be kind'
      })
    ).toEqual({
      action: 'update',
      path: 'spaces/AAAA',
      method: 'patch',
      params: { updateMask: 'displayName,spaceDetails' },
      data: {
        name: 'spaces/AAAA',
        displayName: 'Platform',
        spaceDetails: { description: 'Platform work', guidelines: 'Be kind' }
      },
      spaceName: 'spaces/AAAA'
    });
    expect(buildManageSpaceRequest({ action: 'delete', space: 'AAAA' })).toEqual({
      action: 'delete',
      path: 'spaces/AAAA',
      method: 'delete',
      spaceName: 'spaces/AAAA'
    });
  });

  it('builds all spaces.members requests with explicit role patching', () => {
    expect(
      buildManageMemberRequest({
        action: 'add',
        space: 'AAAA',
        memberType: 'app',
        member: 'app'
      })
    ).toEqual({
      action: 'add',
      path: 'spaces/AAAA/members',
      method: 'post',
      data: { member: { name: 'users/app', type: 'BOT' } }
    });
    expect(
      buildManageMemberRequest({
        action: 'add',
        space: 'AAAA',
        memberType: 'user',
        member: 'person@example.com',
        role: 'ROLE_MANAGER'
      })
    ).toEqual({
      action: 'add',
      path: 'spaces/AAAA/members',
      method: 'post',
      data: {
        member: { name: 'users/person@example.com', type: 'HUMAN' },
        role: 'ROLE_MANAGER'
      }
    });
    expect(
      buildManageMemberRequest({
        action: 'list',
        space: 'AAAA',
        pageSize: 50,
        pageToken: 'page-1',
        filter: 'member.type = "HUMAN"',
        showGroups: true,
        showInvited: true
      })
    ).toEqual({
      action: 'list',
      path: 'spaces/AAAA/members',
      method: 'get',
      params: {
        pageSize: 50,
        pageToken: 'page-1',
        filter: 'member.type = "HUMAN"',
        showGroups: true,
        showInvited: true
      }
    });
    expect(
      buildManageMemberRequest({
        action: 'get',
        space: 'AAAA',
        membership: 'member-1'
      })
    ).toMatchObject({
      path: 'spaces/AAAA/members/member-1',
      method: 'get'
    });
    expect(
      buildManageMemberRequest({
        action: 'update',
        membership: 'spaces/AAAA/members/member-1',
        role: 'ROLE_ASSISTANT_MANAGER'
      })
    ).toEqual({
      action: 'update',
      path: 'spaces/AAAA/members/member-1',
      method: 'patch',
      params: { updateMask: 'role' },
      data: {
        name: 'spaces/AAAA/members/member-1',
        role: 'ROLE_ASSISTANT_MANAGER'
      },
      membershipName: 'spaces/AAAA/members/member-1'
    });
    expect(
      buildManageMemberRequest({
        action: 'remove',
        membership: 'spaces/AAAA/members/member-1'
      })
    ).toMatchObject({
      path: 'spaces/AAAA/members/member-1',
      method: 'delete'
    });
  });

  it('builds exact reaction create, list, and delete requests', () => {
    expect(
      buildManageReactionRequest({
        action: 'create',
        space: 'AAAA',
        message: 'message-1',
        emoji: '👍'
      })
    ).toEqual({
      action: 'create',
      path: 'spaces/AAAA/messages/message-1/reactions',
      method: 'post',
      data: { emoji: { unicode: '👍' } }
    });
    expect(
      buildManageReactionRequest({
        action: 'list',
        message: 'spaces/AAAA/messages/message-1',
        filter: 'emoji.unicode = "👍"',
        pageSize: 25,
        pageToken: 'reaction-page'
      })
    ).toEqual({
      action: 'list',
      path: 'spaces/AAAA/messages/message-1/reactions',
      method: 'get',
      params: {
        filter: 'emoji.unicode = "👍"',
        pageSize: 25,
        pageToken: 'reaction-page'
      }
    });
    expect(
      buildManageReactionRequest({
        action: 'delete',
        reaction: 'spaces/AAAA/messages/message-1/reactions/reaction-1'
      })
    ).toEqual({
      action: 'delete',
      path: 'spaces/AAAA/messages/message-1/reactions/reaction-1',
      method: 'delete',
      reactionName: 'spaces/AAAA/messages/message-1/reactions/reaction-1'
    });
    expect(
      mapGoogleChatReaction({
        name: 'spaces/AAAA/messages/message-1/reactions/reaction-2',
        emoji: {
          customEmoji: {
            name: 'customEmojis/custom-1',
            uid: 'custom-uid-1',
            emojiName: ':party-parrot:'
          }
        }
      })
    ).toMatchObject({ emoji: ':party-parrot:' });
  });

  it('builds direct-message, metadata, media-download, and space-event requests', () => {
    expect(buildFindDirectMessageRequest('person@example.com')).toEqual({
      path: 'spaces:findDirectMessage',
      params: { name: 'users/person@example.com' }
    });
    expect(
      buildGetAttachmentRequest({
        attachment: 'attachment-1',
        message: 'message-1',
        space: 'AAAA'
      })
    ).toEqual({
      attachmentName: 'spaces/AAAA/messages/message-1/attachments/attachment-1'
    });
    expect(buildDownloadAttachmentRequest('spaces/AAAA/attachments/upload-1')).toEqual({
      attachmentDataResourceName: 'spaces/AAAA/attachments/upload-1',
      path: 'media/spaces/AAAA/attachments/upload-1',
      params: { alt: 'media' }
    });
    // Live attachmentDataRef.resourceName values are opaque base64 tokens
    // (verified against the real API 2026-07-15), not spaces/... names.
    expect(
      buildDownloadAttachmentRequest('ClxzcGFjZXMvQUFRQU9jdDluUHcvbWVzc2FnZXM0gEA')
    ).toEqual({
      attachmentDataResourceName: 'ClxzcGFjZXMvQUFRQU9jdDluUHcvbWVzc2FnZXM0gEA',
      path: 'media/ClxzcGFjZXMvQUFRQU9jdDluUHcvbWVzc2FnZXM0gEA',
      params: { alt: 'media' }
    });
    expect(
      buildListSpaceEventsRequest({
        space: 'AAAA',
        filter: 'eventTypes:"google.workspace.chat.message.v1.created"',
        pageSize: 10,
        pageToken: 'event-page'
      })
    ).toEqual({
      mode: 'list',
      path: 'spaces/AAAA/spaceEvents',
      params: {
        filter: 'eventTypes:"google.workspace.chat.message.v1.created"',
        pageSize: 10,
        pageToken: 'event-page'
      }
    });
    expect(
      buildListSpaceEventsRequest({
        eventId: 'spaces/AAAA/spaceEvents/event-1'
      })
    ).toEqual({
      mode: 'get',
      path: 'spaces/AAAA/spaceEvents/event-1',
      eventName: 'spaces/AAAA/spaceEvents/event-1'
    });
  });

  it('constructs a byte-safe multipart upload and returns send-message attachment data', async () => {
    let fileBytes = Buffer.from([0, 255, 10, 65]);
    let built = buildUploadAttachmentRequest(
      {
        space: 'AAAA',
        filename: 'sample.bin',
        mimeType: 'application/octet-stream',
        contentBase64: fileBytes.toString('base64')
      },
      undefined,
      'test-boundary'
    );

    expect(built.path).toBe(
      'https://chat.googleapis.com/upload/v1/spaces/AAAA/attachments:upload'
    );
    expect(built.params).toEqual({ uploadType: 'multipart' });
    expect(built.headers).toEqual({
      'Content-Type': 'multipart/related; boundary=test-boundary'
    });
    expect(built.data.indexOf(fileBytes)).toBeGreaterThan(0);
    expect(built.data.toString('latin1')).toContain('{"filename":"sample.bin"}');

    requestSpy.mockResolvedValueOnce({
      attachmentDataRef: {
        resourceName: 'spaces/AAAA/attachments/upload-1',
        attachmentUploadToken: 'upload-token-1'
      }
    });
    let result = await uploadAttachment.handleInvocation(
      createContext({
        space: 'AAAA',
        filename: 'sample.bin',
        mimeType: 'application/octet-stream',
        contentBase64: fileBytes.toString('base64')
      })
    );

    expect(result.output).toEqual({
      spaceName: 'spaces/AAAA',
      filename: 'sample.bin',
      mimeType: 'application/octet-stream',
      byteLength: fileBytes.byteLength,
      attachmentDataResourceName: 'spaces/AAAA/attachments/upload-1',
      attachmentUploadToken: 'upload-token-1'
    });
    expect(requestSpy).toHaveBeenCalledWith(
      'https://chat.googleapis.com/upload/v1/spaces/AAAA/attachments:upload',
      expect.objectContaining({
        method: 'post',
        params: { uploadType: 'multipart' },
        operation: 'upload attachment'
      })
    );
  });

  it('returns downloaded bytes only through a Slate attachment', async () => {
    let fileBytes = Buffer.from([0, 255, 10, 65]);
    requestSpy.mockResolvedValueOnce(fileBytes);

    let result = await downloadAttachment.handleInvocation(
      createContext({
        attachmentDataResourceName: 'spaces/AAAA/attachments/upload-1',
        filename: 'sample.bin',
        mimeType: 'application/octet-stream'
      })
    );

    expect(result.output).toEqual({
      attachmentDataResourceName: 'spaces/AAAA/attachments/upload-1',
      filename: 'sample.bin',
      mimeType: 'application/octet-stream',
      byteLength: 4,
      attachmentCount: 1
    });
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(result.attachments).toEqual([
      {
        mimeType: 'application/octet-stream',
        content: {
          type: 'content',
          encoding: 'base64',
          content: fileBytes.toString('base64')
        }
      }
    ]);
    expect(requestSpy).toHaveBeenCalledWith('media/spaces/AAAA/attachments/upload-1', {
      method: 'get',
      params: { alt: 'media' },
      responseType: 'arraybuffer',
      operation: 'download attachment'
    });
  });

  it('rejects invalid branch combinations and unsafe media resource names with ServiceError', () => {
    expect(() =>
      buildManageSpaceRequest({
        action: 'update',
        space: 'AAAA',
        description: 'Only one detail field'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildManageSpaceRequest({
        action: 'setup',
        spaceType: 'DIRECT_MESSAGE',
        initialMembers: [{ memberType: 'group', member: 'group-1' }]
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildManageSpaceRequest({
        action: 'setup',
        spaceType: 'GROUP_CHAT',
        singleUserBotDm: false,
        initialMembers: [
          { memberType: 'user', member: 'one@example.com' },
          { memberType: 'user', member: 'two@example.com' }
        ]
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildManageMemberRequest({
        action: 'update',
        membership: 'spaces/AAAA/members/member-1'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildManageMemberRequest({
        action: 'add',
        space: 'AAAA',
        memberType: 'app',
        member: 'other-app'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildManageMemberRequest({
        action: 'add',
        space: 'AAAA',
        memberType: 'group',
        member: 'group@example.com'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildManageReactionRequest({
        action: 'create',
        message: 'spaces/AAAA/messages/message-1'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildManageReactionRequest({
        action: 'delete',
        message: 'spaces/AAAA/messages/message-1',
        reaction: 'spaces/AAAA/messages/message-2/reactions/reaction-1'
      })
    ).toThrow(ServiceError);
    expect(() => buildDownloadAttachmentRequest('../oauth2/token')).toThrow(ServiceError);
    expect(() => buildDownloadAttachmentRequest('spaces/AAAA/attachments/..')).toThrow(
      ServiceError
    );
    expect(() =>
      buildDownloadAttachmentRequest('spaces/AAAA\\oauth2/attachments/token')
    ).toThrow(ServiceError);
    expect(() => buildListSpaceEventsRequest({ space: 'AAAA' })).toThrow(ServiceError);
    expect(() =>
      buildListSpaceEventsRequest({
        space: 'AAAA',
        filter: 'startTime="2026-07-01T00:00:00Z"'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildListSpaceEventsRequest({
        space: 'AAAA',
        filter: 'eventTypes:"google.workspace.chat.message.v1.batchCreated"'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildGetAttachmentRequest({
        space: 'AAAA',
        message: 'message-1',
        attachment: 'spaces/AAAA/messages/message-2/attachments/attachment-1'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildUploadAttachmentRequest({
        space: 'AAAA',
        filename: 'bad.bin',
        mimeType: 'application/octet-stream',
        contentBase64: 'not-base64!'
      })
    ).toThrow(ServiceError);
  });
});
