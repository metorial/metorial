import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatGroupName,
  resolveGoogleChatMembershipName,
  resolveGoogleChatSpaceName,
  resolveGoogleChatUserName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

type GoogleChatMemberIdentity = {
  name?: string;
  displayName?: string;
  type?: string;
};

export type GoogleChatMembership = {
  name?: string;
  state?: string;
  role?: string;
  createTime?: string;
  deleteTime?: string;
  member?: GoogleChatMemberIdentity;
  groupMember?: {
    name?: string;
  };
};

let googleChatMembershipOutputSchema = z.object({
  membershipName: z.string().describe('Full Google Chat membership resource name'),
  state: z.string().optional().describe('Membership state'),
  role: z.string().optional().describe('Membership role'),
  memberName: z.string().optional().describe('User or Chat app resource name'),
  memberDisplayName: z.string().optional().describe('User or Chat app display name'),
  memberType: z.string().optional().describe('Google Chat user type'),
  groupName: z.string().optional().describe('Google Group resource name'),
  createTime: z.string().optional().describe('Membership creation timestamp'),
  deleteTime: z.string().optional().describe('Membership deletion timestamp')
});

export let mapGoogleChatMembership = (membership: GoogleChatMembership) => {
  let membershipName = membership.name?.trim();
  if (!membershipName) {
    throw googleChatValidationError(
      'Google Chat returned a membership without its required resource name.'
    );
  }

  return {
    membershipName,
    state: membership.state,
    role: membership.role,
    memberName: membership.member?.name,
    memberDisplayName: membership.member?.displayName,
    memberType: membership.member?.type,
    groupName: membership.groupMember?.name,
    createTime: membership.createTime,
    deleteTime: membership.deleteTime
  };
};

export type ManageMemberInput = {
  action: 'add' | 'get' | 'list' | 'update' | 'remove';
  space?: string;
  membership?: string;
  memberType?: 'user' | 'group' | 'app';
  member?: string;
  role?: 'ROLE_MEMBER' | 'ROLE_MANAGER' | 'ROLE_ASSISTANT_MANAGER';
  pageSize?: number;
  pageToken?: string;
  filter?: string;
  showGroups?: boolean;
  showInvited?: boolean;
};

export type ManageMemberRequest = {
  action: ManageMemberInput['action'];
  path: string;
  method: 'delete' | 'get' | 'patch' | 'post';
  params?: Record<string, unknown>;
  data?: unknown;
  membershipName?: string;
};

let rejectListFields = (input: ManageMemberInput) => {
  if (
    input.pageSize !== undefined ||
    input.pageToken !== undefined ||
    input.filter !== undefined ||
    input.showGroups !== undefined ||
    input.showInvited !== undefined
  ) {
    throw googleChatValidationError(
      `pageSize, pageToken, filter, showGroups, and showInvited are supported only when action is list, not ${input.action}.`
    );
  }
};

let rejectMemberFields = (input: ManageMemberInput) => {
  if (input.memberType !== undefined || input.member !== undefined) {
    throw googleChatValidationError(
      `memberType and member are supported only when action is add, not ${input.action}.`
    );
  }
};

let resolveMembershipGroupName = (group: string) => {
  let groupName = resolveGoogleChatGroupName(group);
  if (groupName.slice('groups/'.length).includes('@')) {
    throw googleChatValidationError(
      'Google Group memberships require a Cloud Identity group ID; group email aliases are not supported.'
    );
  }
  return groupName;
};

export let buildManageMemberRequest = (
  input: ManageMemberInput,
  defaultSpace?: string
): ManageMemberRequest => {
  if (input.action === 'add') {
    rejectListFields(input);
    if (input.membership !== undefined) {
      throw googleChatValidationError('membership is not supported when action is add.');
    }
    if (!input.memberType || !input.member?.trim()) {
      throw googleChatValidationError(
        'memberType and member are required when action is add.'
      );
    }

    let parent = resolveGoogleChatSpaceName(input.space, defaultSpace);
    let memberName =
      input.memberType === 'group' ? undefined : resolveGoogleChatUserName(input.member);
    if (input.memberType === 'app' && memberName !== 'users/app') {
      throw googleChatValidationError(
        'memberType=app supports only the calling Chat app. Set member to app or users/app.'
      );
    }
    let data = {
      ...(input.memberType === 'group'
        ? { groupMember: { name: resolveMembershipGroupName(input.member) } }
        : {
            member: {
              name: memberName!,
              type: input.memberType === 'app' ? 'BOT' : 'HUMAN'
            }
          }),
      ...(input.role ? { role: input.role } : {})
    };

    return {
      action: input.action,
      path: `${parent}/members`,
      method: 'post',
      data
    };
  }

  if (input.action === 'list') {
    rejectMemberFields(input);
    if (input.membership !== undefined || input.role !== undefined) {
      throw googleChatValidationError(
        'membership and role are not supported when action is list.'
      );
    }
    let parent = resolveGoogleChatSpaceName(input.space, defaultSpace);
    return {
      action: input.action,
      path: `${parent}/members`,
      method: 'get',
      params: pickDefined({
        pageSize: input.pageSize,
        pageToken: input.pageToken,
        filter: input.filter,
        showGroups: input.showGroups,
        showInvited: input.showInvited
      })
    };
  }

  rejectListFields(input);
  rejectMemberFields(input);
  let membershipName = resolveGoogleChatMembershipName(
    input.membership,
    input.space ?? defaultSpace
  );

  if (input.action === 'get' || input.action === 'remove') {
    if (input.role !== undefined) {
      throw googleChatValidationError(
        `role is supported only when action is add or update, not ${input.action}.`
      );
    }
    return {
      action: input.action,
      path: membershipName,
      method: input.action === 'get' ? 'get' : 'delete',
      membershipName
    };
  }

  if (!input.role) {
    throw googleChatValidationError('role is required when action is update.');
  }
  return {
    action: input.action,
    path: membershipName,
    method: 'patch',
    params: { updateMask: 'role' },
    data: { name: membershipName, role: input.role },
    membershipName
  };
};

export let manageMember = SlateTool.create(spec, {
  name: 'Manage Member',
  key: 'manage_member',
  description:
    'Add, get, list, update, or remove Google Chat space memberships for human users, Chat apps, and Google Groups.',
  instructions: [
    'Use **action** "add" to add a human user (memberType=user), Google Group (memberType=group), or the calling Chat app (memberType=app with member=app) to a space. Provide **role** to create the membership as a manager or owner directly.',
    'Use **action** "get" to retrieve one membership by **membership** ID or resource name.',
    'Use **action** "list" to page through space memberships with optional filter, showGroups, and showInvited.',
    'Use **action** "update" to change an existing human membership between regular member, space manager, and space owner. Requires **membership** and **role**.',
    'Use **action** "remove" to delete a membership and remove that principal from the space.',
    'Adding or removing the Chat app itself (memberType=app) requires the chat.memberships.app OAuth scope; user and group memberships require chat.memberships.'
  ],
  constraints: ['Removing a membership immediately removes that principal from the space.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.manageMember)
  .authMethods(googleChatActionAuthMethods.manageMember)
  .input(
    z.object({
      action: z
        .enum(['add', 'get', 'list', 'update', 'remove'])
        .describe('Membership operation to perform'),
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Space ID or spaces/{space} resource name; required unless configured defaultSpace applies'
        ),
      membership: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Membership ID or spaces/{space}/members/{member} resource name for get, update, or remove'
        ),
      memberType: z
        .enum(['user', 'group', 'app'])
        .optional()
        .describe('Principal type for action=add'),
      member: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'User ID or email alias, Cloud Identity group ID, app alias, or full resource name for action=add; group email aliases and non-calling apps are unsupported'
        ),
      role: z
        .enum(['ROLE_MEMBER', 'ROLE_MANAGER', 'ROLE_ASSISTANT_MANAGER'])
        .optional()
        .describe(
          'Membership role for action=add (create with this role directly) or action=update (replace the role): ROLE_MEMBER (regular member), ROLE_ASSISTANT_MANAGER (space manager), or ROLE_MANAGER (space owner)'
        ),
      pageSize: z
        .number()
        .int()
        .positive()
        .max(1000)
        .optional()
        .describe('Maximum memberships to return for action=list'),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Pagination token for action=list'),
      filter: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Google Chat membership filter for action=list'),
      showGroups: z
        .boolean()
        .optional()
        .describe('Whether action=list includes Google Group memberships'),
      showInvited: z
        .boolean()
        .optional()
        .describe('Whether action=list includes invited memberships')
    })
  )
  .output(
    z.object({
      action: z
        .enum(['add', 'get', 'list', 'update', 'remove'])
        .describe('Completed operation'),
      membershipName: z
        .string()
        .optional()
        .describe('Full resource name for a single membership'),
      membership: googleChatMembershipOutputSchema
        .optional()
        .describe('Added, retrieved, or updated membership'),
      memberships: z
        .array(googleChatMembershipOutputSchema)
        .optional()
        .describe('Memberships returned by action=list'),
      nextPageToken: z.string().optional().describe('Token for the next page of memberships'),
      removed: z.boolean().optional().describe('True when the membership was removed')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildManageMemberRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);

    if (request.action === 'remove') {
      await client.request<Record<string, never>>(request.path, {
        method: request.method,
        operation: 'remove member'
      });
      return {
        output: {
          action: request.action,
          membershipName: request.membershipName,
          removed: true
        },
        message: `Removed membership \`${request.membershipName}\`.`
      };
    }

    if (request.action === 'list') {
      let response = await client.request<{
        memberships?: GoogleChatMembership[];
        nextPageToken?: string;
      }>(request.path, {
        method: request.method,
        params: request.params,
        operation: 'list members'
      });
      let memberships = (response.memberships ?? []).map(mapGoogleChatMembership);
      return {
        output: {
          action: request.action,
          memberships,
          nextPageToken: response.nextPageToken
        },
        message: `Found **${memberships.length}** membership(s).`
      };
    }

    let response = await client.request<GoogleChatMembership>(request.path, {
      method: request.method,
      params: request.params,
      data: request.data,
      operation: `${request.action} member`
    });
    let membership = mapGoogleChatMembership(response);
    return {
      output: {
        action: request.action,
        membershipName: membership.membershipName,
        membership
      },
      message: `${request.action === 'get' ? 'Retrieved' : request.action === 'update' ? 'Updated' : 'Added'} membership \`${membership.membershipName}\`.`
    };
  })
  .build();
