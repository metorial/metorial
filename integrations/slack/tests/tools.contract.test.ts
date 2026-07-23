import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../src';
import { slackBotOAuthScopes, slackUserOAuthScopes } from '../src/lib/scopes';
import {
  decodeSlackFileBase64,
  SLACK_MAX_UPLOAD_BASE64_CHARACTERS
} from '../src/tools/upload-file';

const ESTABLISHED_TOOL_KEYS = [
  'send_message',
  'update_message',
  'schedule_message',
  'manage_scheduled_messages',
  'get_conversation_history',
  'get_conversation_info',
  'open_conversation',
  'list_conversations',
  'manage_channel',
  'manage_channel_members',
  'get_user_info',
  'manage_user_status',
  'manage_reactions',
  'manage_pins',
  'manage_files',
  'search_messages',
  'search_files',
  'manage_reminders',
  'manage_user_groups',
  'manage_bookmarks',
  'get_team_info'
] as const;

const ADDED_TOOL_KEYS = [
  'who_am_i',
  'read_thread',
  'get_message_permalink',
  'read_file',
  'upload_file',
  'search_public',
  'search_public_and_private',
  'search_channels',
  'search_users',
  'create_canvas',
  'edit_canvas',
  'lookup_canvas_sections',
  'search_emojis',
  'update_user_profile',
  'create_slack_list',
  'list_slack_list_items',
  'create_slack_list_item',
  'update_slack_list_items',
  'delete_slack_list_items',
  'manage_canvas_access',
  'delete_canvas',
  'manage_slack_list_access',
  'download_slack_list',
  'get_message',
  'mark_conversation_read',
  'manage_dnd',
  'manage_presence'
] as const;

const EXPECTED_TOOL_KEYS = [...ESTABLISHED_TOOL_KEYS, ...ADDED_TOOL_KEYS] as const;
const PUBLIC_COPY_LEAK_PATTERN =
  /\bslates?\b|create(?:base64|text)attachment|\battachmentcount\b|\bfile[- ]delivery\b|\battachment transport\b/i;

describeMcpCompatibleToolSchemas('Slack tool input schemas', provider.actions);

describe('Slack expanded tool contract', () => {
  let toolKeys = provider.actions
    .filter(action => action.type === 'tool')
    .map(action => action.key);

  it('keeps all established tools and exposes all normalized additions', () => {
    expect(new Set(EXPECTED_TOOL_KEYS).size).toBe(48);
    expect(toolKeys).toHaveLength(EXPECTED_TOOL_KEYS.length);
    expect([...toolKeys].sort()).toEqual([...EXPECTED_TOOL_KEYS].sort());
  });

  it('keeps unsupported Canvas read and draft capabilities out of the surface', () => {
    expect(toolKeys).not.toContain('read_canvas');
    expect(toolKeys).not.toContain('send_message_draft');
  });

  it('keeps every production tool ID under 60 characters', () => {
    expect(toolKeys.every(key => `slack-${key}`.length < 60)).toBe(true);
  });

  it('keeps internal platform terminology out of public tool metadata', () => {
    for (let action of provider.actions.filter(action => action.type === 'tool')) {
      let publicMetadata = {
        name: action._params.name,
        description: action._params.description,
        instructions: action._params.instructions,
        constraints: action._params.constraints,
        inputSchema: action._inputSchema.toJSONSchema(),
        outputSchema: action._outputSchema.toJSONSchema()
      };

      expect(JSON.stringify(publicMetadata)).not.toMatch(PUBLIC_COPY_LEAK_PATTERN);
    }
  });
});

const BOT_OAUTH_SCOPE_MANIFEST = [
  'chat:write',
  'chat:write.public',
  'channels:read',
  'channels:manage',
  'channels:history',
  'channels:join',
  'groups:read',
  'groups:history',
  'groups:write',
  'im:read',
  'im:history',
  'im:write',
  'mpim:read',
  'mpim:history',
  'mpim:write',
  'users:read',
  'users:read.email',
  'files:read',
  'files:write',
  'canvases:read',
  'canvases:write',
  'lists:read',
  'lists:write',
  'emoji:read',
  'reactions:read',
  'reactions:write',
  'pins:read',
  'pins:write',
  'bookmarks:read',
  'bookmarks:write',
  'usergroups:read',
  'usergroups:write',
  'team:read'
] as const;

const USER_OAUTH_SCOPE_MANIFEST = [
  'chat:write',
  'channels:read',
  'channels:write',
  'channels:history',
  'groups:read',
  'groups:history',
  'groups:write',
  'im:read',
  'im:history',
  'im:write',
  'mpim:read',
  'mpim:history',
  'mpim:write',
  'users:read',
  'users:read.email',
  'users.profile:read',
  'users.profile:write',
  'users:write',
  'files:read',
  'files:write',
  'canvases:read',
  'canvases:write',
  'lists:read',
  'lists:write',
  'emoji:read',
  'reactions:read',
  'reactions:write',
  'pins:read',
  'pins:write',
  'bookmarks:read',
  'bookmarks:write',
  'usergroups:read',
  'usergroups:write',
  'reminders:read',
  'reminders:write',
  'team:read',
  'search:read',
  'search:read.public',
  'search:read.private',
  'search:read.im',
  'search:read.mpim',
  'search:read.files',
  'search:read.users',
  'dnd:read',
  'dnd:write'
] as const;

const USER_AUTH_METHODS = ['user_oauth', 'user_token'] as const;

const CONVERSATION_READ_GATE = [
  ['channels:read'],
  ['groups:read'],
  ['im:read'],
  ['mpim:read']
];
const CONVERSATION_HISTORY_GATE = [
  ['channels:history'],
  ['groups:history'],
  ['im:history'],
  ['mpim:history']
];

type ExpectedToolAuthorization = {
  scopes: string[][] | null;
  authMethods: readonly string[] | null;
};

const EXPECTED_TOOL_AUTHORIZATION: Record<string, ExpectedToolAuthorization> = {
  send_message: { scopes: [['chat:write']], authMethods: null },
  update_message: { scopes: [['chat:write']], authMethods: null },
  schedule_message: { scopes: [['chat:write']], authMethods: null },
  manage_scheduled_messages: { scopes: [['chat:write']], authMethods: null },
  get_conversation_history: { scopes: CONVERSATION_HISTORY_GATE, authMethods: null },
  get_conversation_info: { scopes: CONVERSATION_READ_GATE, authMethods: null },
  open_conversation: { scopes: [['im:write'], ['mpim:write']], authMethods: null },
  list_conversations: { scopes: CONVERSATION_READ_GATE, authMethods: null },
  manage_channel: {
    scopes: [['channels:manage', 'channels:write'], ['groups:write']],
    authMethods: null
  },
  manage_channel_members: {
    scopes: [
      ['channels:read'],
      ['groups:read'],
      ['im:read'],
      ['mpim:read'],
      ['channels:manage', 'channels:write'],
      ['channels:join', 'channels:write'],
      ['groups:write'],
      ['im:write'],
      ['mpim:write']
    ],
    authMethods: null
  },
  get_user_info: { scopes: [['users:read'], ['users:read.email']], authMethods: null },
  manage_user_status: {
    scopes: [['users.profile:read'], ['users.profile:write']],
    authMethods: USER_AUTH_METHODS
  },
  manage_reactions: { scopes: [['reactions:read'], ['reactions:write']], authMethods: null },
  manage_pins: { scopes: [['pins:read'], ['pins:write']], authMethods: null },
  manage_files: { scopes: [['files:read'], ['files:write']], authMethods: null },
  search_messages: { scopes: [['search:read']], authMethods: USER_AUTH_METHODS },
  search_files: { scopes: [['search:read']], authMethods: USER_AUTH_METHODS },
  manage_reminders: {
    scopes: [['reminders:read'], ['reminders:write']],
    authMethods: USER_AUTH_METHODS
  },
  manage_user_groups: {
    scopes: [['usergroups:read'], ['usergroups:write']],
    authMethods: null
  },
  manage_bookmarks: { scopes: [['bookmarks:read'], ['bookmarks:write']], authMethods: null },
  get_team_info: { scopes: [['team:read']], authMethods: null },
  who_am_i: { scopes: null, authMethods: null },
  read_thread: { scopes: CONVERSATION_HISTORY_GATE, authMethods: null },
  get_message_permalink: { scopes: null, authMethods: null },
  read_file: { scopes: [['files:read']], authMethods: null },
  upload_file: { scopes: [['files:write']], authMethods: null },
  search_public: { scopes: [['search:read.public']], authMethods: USER_AUTH_METHODS },
  search_public_and_private: {
    scopes: [
      ['search:read.public'],
      ['search:read.private'],
      ['search:read.im'],
      ['search:read.mpim']
    ],
    authMethods: USER_AUTH_METHODS
  },
  search_channels: { scopes: [['search:read.public']], authMethods: USER_AUTH_METHODS },
  search_users: { scopes: [['search:read.users']], authMethods: USER_AUTH_METHODS },
  create_canvas: { scopes: [['canvases:write']], authMethods: null },
  edit_canvas: { scopes: [['canvases:write']], authMethods: null },
  lookup_canvas_sections: { scopes: [['canvases:read']], authMethods: null },
  search_emojis: { scopes: [['emoji:read']], authMethods: null },
  update_user_profile: {
    scopes: [['users.profile:write']],
    authMethods: USER_AUTH_METHODS
  },
  create_slack_list: { scopes: [['lists:write']], authMethods: null },
  list_slack_list_items: { scopes: [['lists:read']], authMethods: null },
  create_slack_list_item: { scopes: [['lists:write']], authMethods: null },
  update_slack_list_items: { scopes: [['lists:write']], authMethods: null },
  delete_slack_list_items: { scopes: [['lists:write']], authMethods: null },
  manage_canvas_access: { scopes: [['canvases:write']], authMethods: null },
  delete_canvas: { scopes: [['canvases:write']], authMethods: null },
  manage_slack_list_access: { scopes: [['lists:write']], authMethods: null },
  download_slack_list: { scopes: [['lists:read']], authMethods: null },
  get_message: { scopes: CONVERSATION_HISTORY_GATE, authMethods: null },
  mark_conversation_read: {
    scopes: [['channels:write', 'groups:write', 'im:write', 'mpim:write']],
    authMethods: USER_AUTH_METHODS
  },
  manage_dnd: { scopes: [['dnd:read', 'dnd:write']], authMethods: USER_AUTH_METHODS },
  manage_presence: { scopes: [['users:read', 'users:write']], authMethods: null }
};

let normalizeScopeGate = (scopes: { AND: { OR: string[] }[] } | undefined) =>
  scopes ? scopes.AND.map(clause => [...clause.OR].sort()) : null;

describe('Slack scope manifest contract', () => {
  it('requests exactly the reviewed bot OAuth scope manifest', () => {
    expect(slackBotOAuthScopes.map(entry => entry.scope)).toEqual([
      ...BOT_OAUTH_SCOPE_MANIFEST
    ]);
  });

  it('requests exactly the reviewed user OAuth scope manifest', () => {
    expect(slackUserOAuthScopes.map(entry => entry.scope)).toEqual([
      ...USER_OAUTH_SCOPE_MANIFEST
    ]);
  });

  it('gates every tool on scopes declared by at least one OAuth method', () => {
    let declaredScopes = new Set<string>([
      ...BOT_OAUTH_SCOPE_MANIFEST,
      ...USER_OAUTH_SCOPE_MANIFEST
    ]);

    for (let action of provider.actions.filter(action => action.type === 'tool')) {
      for (let clause of normalizeScopeGate(action.scopes as any) ?? []) {
        expect(
          clause.some(scope => declaredScopes.has(scope)),
          `tool ${action.key} requires a scope clause no OAuth method declares: ${clause.join(', ')}`
        ).toBe(true);
      }
    }
  });
});

describe('Slack per-tool authorization contract', () => {
  it('pins the scope gate and auth-method restriction of every tool', () => {
    let actual: Record<string, ExpectedToolAuthorization> = {};

    for (let action of provider.actions.filter(action => action.type === 'tool')) {
      actual[action.key] = {
        scopes: normalizeScopeGate(action.scopes as any),
        authMethods: action.authMethods ? [...action.authMethods].sort() : null
      };
    }

    let expected = Object.fromEntries(
      Object.entries(EXPECTED_TOOL_AUTHORIZATION).map(([key, value]) => [
        key,
        {
          scopes: value.scopes,
          authMethods: value.authMethods ? [...value.authMethods].sort() : null
        }
      ])
    );

    expect(actual).toEqual(expected);
  });
});

describe('Slack base64 upload validation', () => {
  it('decodes canonical non-empty base64 content', () => {
    expect(decodeSlackFileBase64('SGVsbG8=').toString('utf8')).toBe('Hello');
  });

  it('rejects malformed and transport-unsafe oversized payloads', () => {
    expect(() => decodeSlackFileBase64('not base64')).toThrow(
      'contentBase64 must be valid base64-encoded file bytes'
    );
    expect(() =>
      decodeSlackFileBase64('A'.repeat(SLACK_MAX_UPLOAD_BASE64_CHARACTERS + 4))
    ).toThrow('Slack base64 file uploads are limited to 6 MiB');
  });
});
