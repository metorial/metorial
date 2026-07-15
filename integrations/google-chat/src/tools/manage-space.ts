import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatGroupName,
  resolveGoogleChatSpaceName,
  resolveGoogleChatUserName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export type GoogleChatSpace = {
  name?: string;
  displayName?: string;
  spaceType?: string;
  singleUserBotDm?: boolean;
  spaceDetails?: {
    description?: string;
    guidelines?: string;
  };
  spaceHistoryState?: string;
  createTime?: string;
  lastActiveTime?: string;
  spaceUri?: string;
};

export let googleChatSpaceOutputSchema = z.object({
  spaceName: z.string().describe('Full Google Chat space resource name'),
  displayName: z.string().optional().describe('Display name of the space'),
  spaceType: z.string().optional().describe('Google Chat space type'),
  singleUserBotDm: z
    .boolean()
    .optional()
    .describe('Whether this is a direct message between one user and the Chat app'),
  description: z.string().optional().describe('Space description'),
  guidelines: z.string().optional().describe('Space guidelines'),
  historyState: z.string().optional().describe('Message history state'),
  createTime: z.string().optional().describe('Space creation timestamp'),
  lastActiveTime: z.string().optional().describe('Timestamp of the most recent activity'),
  spaceUri: z.string().optional().describe('Browser URI for the space')
});

export let mapGoogleChatSpace = (space: GoogleChatSpace) => {
  let spaceName = space.name?.trim();
  if (!spaceName) {
    throw googleChatValidationError(
      'Google Chat returned a space without its required resource name.'
    );
  }

  return {
    spaceName,
    displayName: space.displayName,
    spaceType: space.spaceType,
    singleUserBotDm: space.singleUserBotDm,
    description: space.spaceDetails?.description,
    guidelines: space.spaceDetails?.guidelines,
    historyState: space.spaceHistoryState,
    createTime: space.createTime,
    lastActiveTime: space.lastActiveTime,
    spaceUri: space.spaceUri
  };
};

type InitialMember = {
  memberType: 'group' | 'user';
  member: string;
};

export type ManageSpaceInput = {
  action: 'create' | 'setup' | 'get' | 'update' | 'delete';
  space?: string;
  spaceType?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  displayName?: string;
  description?: string;
  guidelines?: string;
  singleUserBotDm?: boolean;
  spaceHistoryState?: 'HISTORY_ON' | 'HISTORY_OFF';
  initialMembers?: InitialMember[];
  requestId?: string;
};

let buildSpaceBody = (input: ManageSpaceInput) => ({
  ...(input.spaceType !== undefined ? { spaceType: input.spaceType } : {}),
  ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
  ...(input.singleUserBotDm !== undefined ? { singleUserBotDm: input.singleUserBotDm } : {}),
  ...(input.spaceHistoryState !== undefined
    ? { spaceHistoryState: input.spaceHistoryState }
    : {}),
  ...(input.description !== undefined || input.guidelines !== undefined
    ? {
        spaceDetails: pickDefined({
          description: input.description,
          guidelines: input.guidelines
        })
      }
    : {})
});

let resolveInitialGroupName = (group: string) => {
  let groupName = resolveGoogleChatGroupName(group);
  if (groupName.slice('groups/'.length).includes('@')) {
    throw googleChatValidationError(
      'Google Group members require a Cloud Identity group ID; group email aliases are not supported.'
    );
  }
  return groupName;
};

let buildInitialMemberships = (members: InitialMember[] | undefined) =>
  members?.map(item =>
    item.memberType === 'group'
      ? { groupMember: { name: resolveInitialGroupName(item.member) } }
      : {
          member: {
            name: resolveGoogleChatUserName(item.member),
            type: 'HUMAN'
          }
        }
  );

let rejectUnusedMutationFields = (input: ManageSpaceInput) => {
  if (
    input.spaceType !== undefined ||
    input.displayName !== undefined ||
    input.description !== undefined ||
    input.guidelines !== undefined ||
    input.singleUserBotDm !== undefined ||
    input.spaceHistoryState !== undefined ||
    input.initialMembers !== undefined ||
    input.requestId !== undefined
  ) {
    throw googleChatValidationError(
      `Space mutation fields are not supported when action is ${input.action}.`
    );
  }
};

export type ManageSpaceRequest = {
  action: ManageSpaceInput['action'];
  path: string;
  method: 'delete' | 'get' | 'patch' | 'post';
  params?: Record<string, unknown>;
  data?: unknown;
  spaceName?: string;
};

export let buildManageSpaceRequest = (
  input: ManageSpaceInput,
  defaultSpace?: string
): ManageSpaceRequest => {
  if (input.action === 'create') {
    if (input.space !== undefined || input.initialMembers !== undefined) {
      throw googleChatValidationError(
        'space and initialMembers are not supported when action is create. Use setup to add initial members.'
      );
    }
    if (input.spaceType !== 'SPACE') {
      throw googleChatValidationError(
        'spaceType must be SPACE when action is create. Use setup for group chats or direct messages.'
      );
    }
    if (!input.displayName?.trim()) {
      throw googleChatValidationError('displayName is required when action is create.');
    }
    if (input.singleUserBotDm !== undefined) {
      throw googleChatValidationError(
        'singleUserBotDm is supported only by action=setup for direct messages.'
      );
    }

    return {
      action: input.action,
      path: 'spaces',
      method: 'post',
      params: pickDefined({ requestId: input.requestId }),
      data: buildSpaceBody(input)
    };
  }

  if (input.action === 'setup') {
    if (input.space !== undefined || input.spaceHistoryState !== undefined) {
      throw googleChatValidationError(
        'space and spaceHistoryState are not supported when action is setup.'
      );
    }
    if (!input.spaceType) {
      throw googleChatValidationError('spaceType is required when action is setup.');
    }
    if (input.spaceType === 'SPACE' && !input.displayName?.trim()) {
      throw googleChatValidationError(
        'displayName is required when setting up a named SPACE.'
      );
    }
    if (input.spaceType !== 'SPACE' && input.displayName !== undefined) {
      throw googleChatValidationError(
        'displayName must be omitted when setting up a GROUP_CHAT or DIRECT_MESSAGE.'
      );
    }
    if (input.spaceType !== 'DIRECT_MESSAGE' && input.singleUserBotDm !== undefined) {
      throw googleChatValidationError(
        'singleUserBotDm is supported only when setting up a DIRECT_MESSAGE.'
      );
    }
    if (
      input.spaceType === 'DIRECT_MESSAGE' &&
      (input.description !== undefined || input.guidelines !== undefined)
    ) {
      throw googleChatValidationError(
        'description and guidelines must be omitted when setting up a DIRECT_MESSAGE.'
      );
    }
    if (
      input.spaceType !== 'SPACE' &&
      input.initialMembers?.some(member => member.memberType === 'group')
    ) {
      throw googleChatValidationError(
        'Google Groups can be initial members only when setting up a named SPACE.'
      );
    }
    if (
      input.spaceType === 'DIRECT_MESSAGE' &&
      !input.singleUserBotDm &&
      input.initialMembers?.length !== 1
    ) {
      throw googleChatValidationError(
        'A human DIRECT_MESSAGE setup requires exactly one initial member.'
      );
    }
    if (
      input.spaceType === 'DIRECT_MESSAGE' &&
      input.singleUserBotDm &&
      (input.initialMembers?.length ?? 0) > 0
    ) {
      throw googleChatValidationError(
        'initialMembers must be empty for a direct message between the calling user and Chat app.'
      );
    }
    if (input.spaceType === 'GROUP_CHAT' && (input.initialMembers?.length ?? 0) < 2) {
      throw googleChatValidationError(
        'GROUP_CHAT setup requires at least two initial members.'
      );
    }

    return {
      action: input.action,
      path: 'spaces:setup',
      method: 'post',
      data: {
        space: {
          ...buildSpaceBody(input),
          ...(input.spaceType === 'DIRECT_MESSAGE'
            ? { singleUserBotDm: input.singleUserBotDm ?? false }
            : {})
        },
        ...(input.requestId ? { requestId: input.requestId } : {}),
        ...(input.initialMembers?.length
          ? { memberships: buildInitialMemberships(input.initialMembers) }
          : {})
      }
    };
  }

  let spaceName = resolveGoogleChatSpaceName(input.space, defaultSpace);

  if (input.action === 'get' || input.action === 'delete') {
    rejectUnusedMutationFields(input);
    return {
      action: input.action,
      path: spaceName,
      method: input.action === 'get' ? 'get' : 'delete',
      spaceName
    };
  }

  if (input.initialMembers !== undefined || input.requestId !== undefined) {
    throw googleChatValidationError(
      'initialMembers and requestId are supported only by action=create or action=setup.'
    );
  }
  if (input.singleUserBotDm !== undefined) {
    throw googleChatValidationError('singleUserBotDm cannot be updated.');
  }
  if (input.displayName !== undefined && !input.displayName.trim()) {
    throw googleChatValidationError('displayName cannot be empty when updating a space.');
  }
  if ((input.description === undefined) !== (input.guidelines === undefined)) {
    throw googleChatValidationError(
      'description and guidelines must both be provided when updating space details.'
    );
  }

  let updateMask: string[] = [];
  if (input.displayName !== undefined) updateMask.push('displayName');
  if (input.spaceType !== undefined) updateMask.push('spaceType');
  if (input.description !== undefined) updateMask.push('spaceDetails');
  if (input.spaceHistoryState !== undefined) updateMask.push('spaceHistoryState');
  if (updateMask.length === 0) {
    throw googleChatValidationError(
      'Provide at least one update field when action is update.'
    );
  }
  if (input.spaceHistoryState !== undefined && updateMask.length > 1) {
    throw googleChatValidationError(
      'spaceHistoryState must be updated by itself without other fields.'
    );
  }
  if (input.spaceType !== undefined && input.spaceType !== 'SPACE') {
    throw googleChatValidationError(
      'Google Chat only supports changing a GROUP_CHAT to spaceType SPACE.'
    );
  }
  if (input.spaceType === 'SPACE' && !input.displayName?.trim()) {
    throw googleChatValidationError(
      'displayName is required when updating spaceType to SPACE.'
    );
  }

  return {
    action: input.action,
    path: spaceName,
    method: 'patch',
    params: { updateMask: updateMask.join(',') },
    data: { name: spaceName, ...buildSpaceBody(input) },
    spaceName
  };
};

export let manageSpace = SlateTool.create(spec, {
  name: 'Manage Space',
  key: 'manage_space',
  description:
    'Create, set up, get, update, or delete a Google Chat space. Setup can create a named space, group chat, or direct message with initial members.',
  instructions: [
    'Use **action** "create" to create an empty named space; requires spaceType=SPACE and **displayName**. Needs the chat.spaces scope.',
    'Use **action** "setup" to create a named space, group chat, or direct message together with initialMembers. Needs the chat.spaces scope.',
    'Use **action** "get" to retrieve one space; the read-only chat.spaces.readonly scope is sufficient.',
    'Use **action** "update" to patch displayName, spaceType (GROUP_CHAT to SPACE only), space details, or history state. Needs the chat.spaces scope. description and guidelines must be supplied together because Google replaces the complete spaceDetails object.',
    'Use **action** "delete" to irreversibly delete a space. Google additionally requires the separate Chat delete scope (chat.delete) and returns HTTP 403 without it.'
  ],
  constraints: ['Deleting a Google Chat space is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.manageSpace)
  .authMethods(googleChatActionAuthMethods.manageSpace)
  .input(
    z.object({
      action: z
        .enum(['create', 'setup', 'get', 'update', 'delete'])
        .describe('Space operation to perform'),
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Space ID or spaces/{space} resource name for get, update, or delete; defaults to configured defaultSpace'
        ),
      spaceType: z
        .enum(['SPACE', 'GROUP_CHAT', 'DIRECT_MESSAGE'])
        .optional()
        .describe('Space type for create, setup, or the supported GROUP_CHAT-to-SPACE update'),
      displayName: z
        .string()
        .trim()
        .min(1)
        .max(128)
        .optional()
        .describe('Display name for a named space; required when creating SPACE'),
      description: z
        .string()
        .max(150)
        .optional()
        .describe('Space description for create, setup, or update'),
      guidelines: z
        .string()
        .max(5000)
        .optional()
        .describe('Space guidelines for create, setup, or update'),
      singleUserBotDm: z
        .boolean()
        .optional()
        .describe('For setup DIRECT_MESSAGE, create a DM between the caller and Chat app'),
      spaceHistoryState: z
        .enum(['HISTORY_ON', 'HISTORY_OFF'])
        .optional()
        .describe('History state; update must change this field by itself'),
      initialMembers: z
        .array(
          z.object({
            memberType: z
              .enum(['user', 'group'])
              .describe('Whether this initial member is a user or Google Group'),
            member: z
              .string()
              .trim()
              .min(1)
              .describe(
                'User ID, user email alias, Cloud Identity group ID, or full resource name; group email aliases are not supported'
              )
          })
        )
        .max(49)
        .optional()
        .describe('Initial memberships for action=setup; omit the calling user'),
      requestId: z
        .string()
        .uuid()
        .optional()
        .describe('Idempotency UUID for action=create or action=setup')
    })
  )
  .output(
    z.object({
      action: z
        .enum(['create', 'setup', 'get', 'update', 'delete'])
        .describe('Completed operation'),
      spaceName: z.string().describe('Full resource name of the target space'),
      space: googleChatSpaceOutputSchema
        .optional()
        .describe('Created, configured, retrieved, or updated space'),
      deleted: z.boolean().optional().describe('True when the space was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildManageSpaceRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);

    if (request.action === 'delete') {
      await client.request<Record<string, never>>(request.path, {
        method: request.method,
        operation: 'delete space'
      });
      return {
        output: {
          action: request.action,
          spaceName: request.spaceName!,
          deleted: true
        },
        message: `Deleted space \`${request.spaceName}\`.`
      };
    }

    let response = await client.request<GoogleChatSpace>(request.path, {
      method: request.method,
      params: request.params,
      data: request.data,
      operation: `${request.action} space`
    });
    let space = mapGoogleChatSpace(response);

    return {
      output: {
        action: request.action,
        spaceName: space.spaceName,
        space
      },
      message: `${request.action === 'get' ? 'Retrieved' : request.action === 'update' ? 'Updated' : 'Created'} space \`${space.spaceName}\`.`
    };
  })
  .build();
