import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatMembershipName,
  resolveGoogleChatSpaceName,
  resolveGoogleChatUserName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';
import { resolveInitialGroupName } from './manage-space';

/** https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.members */
export type GoogleChatMembership = {
  name?: string;
  state?: string;
  role?: string;
  affiliation?: string;
  createTime?: string;
  deleteTime?: string;
  member?: {
    name?: string;
    displayName?: string;
    type?: string;
  };
  groupMember?: {
    name?: string;
  };
};

let membershipRoles = ['ROLE_MEMBER', 'ROLE_MANAGER', 'ROLE_ASSISTANT_MANAGER'] as const;

export let googleChatMembershipOutputSchema = z.object({
  membershipName: z
    .string()
    .describe('Full membership resource name, spaces/{space}/members/{member}'),
  state: z.string().optional().describe('Membership state: JOINED, INVITED, or NOT_A_MEMBER'),
  role: z
    .string()
    .optional()
    .describe(
      'Membership role: ROLE_MEMBER, ROLE_MANAGER (Owner in the Chat UI), or ROLE_ASSISTANT_MANAGER (Manager in the Chat UI)'
    ),
  affiliation: z
    .string()
    .optional()
    .describe(
      "Member's relationship to the space's Workspace organization: INTERNAL, EXTERNAL, or MANAGED_EXTERNAL"
    ),
  memberType: z
    .enum(['user', 'group', 'unknown'])
    .describe('Whether the membership belongs to a user or app, or to a Google Group'),
  userName: z.string().optional().describe('users/{user} resource name of the user or app'),
  userDisplayName: z
    .string()
    .optional()
    .describe('Display name, when Google returns it for the caller'),
  userType: z.string().optional().describe('User type: HUMAN or BOT'),
  groupName: z.string().optional().describe('groups/{group} resource name of a Google Group'),
  createTime: z.string().optional().describe('When the member joined or was invited'),
  deleteTime: z.string().optional().describe('When the member left or was removed')
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
    affiliation: membership.affiliation,
    memberType: membership.member
      ? ('user' as const)
      : membership.groupMember
        ? ('group' as const)
        : ('unknown' as const),
    userName: membership.member?.name,
    userDisplayName: membership.member?.displayName || undefined,
    userType: membership.member?.type,
    groupName: membership.groupMember?.name,
    createTime: membership.createTime,
    deleteTime: membership.deleteTime
  };
};

let spaceInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    'Space ID or spaces/{space} resource name; defaults to defaultSpace. Call search_conversations to discover spaces.'
  );

export type ListMembersInput = {
  space?: string;
  filter?: string;
  showGroups?: boolean;
  showInvited?: boolean;
  pageSize?: number;
  pageToken?: string;
};

export let buildListMembersRequest = (input: ListMembersInput, defaultSpace?: string) => {
  let parent = resolveGoogleChatSpaceName(input.space, defaultSpace);
  return {
    parent,
    path: `${parent}/members`,
    params: pickDefined({
      filter: input.filter?.trim() || undefined,
      showGroups: input.showGroups,
      showInvited: input.showInvited,
      pageSize: input.pageSize ?? 100,
      pageToken: input.pageToken
    })
  };
};

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description:
    'List the members of a Google Chat space, with optional role and member-type filters, Google Group and invited memberships, and page-token pagination.',
  instructions: [
    'Filter by role and member.type, for example role = "ROLE_MANAGER" or member.type = "HUMAN" AND role = "ROLE_MEMBER". member.type also supports != such as member.type != "BOT".',
    'Set showGroups to include Google Group memberships and showInvited to include pending invitations (user OAuth only).'
  ],
  constraints: [
    'With Chat app authentication, Google omits app memberships, including the calling app, and showInvited is not supported.',
    'With user OAuth, Google may return only the name and type of members the signed-in user has no prior interaction with.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.listMembers)
  .authMethods(googleChatActionAuthMethods.listMembers)
  .input(
    z.object({
      space: spaceInput,
      filter: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Optional Google Chat membership filter on role (ROLE_MEMBER, ROLE_MANAGER) and member.type (HUMAN, BOT) joined with AND or OR'
        ),
      showGroups: z
        .boolean()
        .optional()
        .describe('Include Google Group memberships that match the filter'),
      showInvited: z
        .boolean()
        .optional()
        .describe('Include invited members that have not joined yet; requires user OAuth'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum memberships to return; defaults to 100 and supports up to 1000'),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Token for the next page; keep the other inputs unchanged')
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Space whose members were listed'),
      memberships: z
        .array(googleChatMembershipOutputSchema)
        .describe('Memberships in this result page'),
      nextPageToken: z.string().optional().describe('Token for the next result page'),
      returnedCount: z
        .number()
        .int()
        .nonnegative()
        .describe('Memberships returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildListMembersRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<{
      memberships?: GoogleChatMembership[];
      nextPageToken?: string;
    }>(request.path, {
      method: 'get',
      params: request.params,
      operation: 'list members'
    });
    let memberships = (response.memberships ?? []).map(mapGoogleChatMembership);

    return {
      output: {
        spaceName: request.parent,
        memberships,
        nextPageToken: response.nextPageToken || undefined,
        returnedCount: memberships.length
      },
      message: `Found **${memberships.length}** member(s) in \`${request.parent}\`${response.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();

export type ManageMembershipInput = {
  action: 'get' | 'add' | 'update' | 'remove';
  space?: string;
  membership?: string;
  memberType?: 'user' | 'group';
  member?: string;
  role?: (typeof membershipRoles)[number];
};

export type ManageMembershipRequest = {
  action: ManageMembershipInput['action'];
  path: string;
  method: 'delete' | 'get' | 'patch' | 'post';
  params?: Record<string, unknown>;
  data?: unknown;
};

// Membership IDs are the member's user ID or email, so users/{user} names map directly.
// A bare ID uses the explicit space, then defaultSpace; a full name must match an explicit space.
let resolveMembershipName = (
  membership: string | undefined,
  explicitSpace: string | undefined,
  defaultSpace: string | undefined
) => {
  let resolved = membership?.trim();
  let userId = resolved ? /^users\/([^/\s?#]+)$/.exec(resolved)?.[1] : undefined;
  let name = resolveGoogleChatMembershipName(
    userId ?? resolved,
    explicitSpace ?? defaultSpace
  );
  if (explicitSpace && !name.startsWith(`${explicitSpace}/members/`)) {
    throw googleChatValidationError(
      `The membership ${name} does not belong to ${explicitSpace}; pass a membership from the same space.`
    );
  }
  return name;
};

export let buildManageMembershipRequest = (
  input: ManageMembershipInput,
  defaultSpace?: string
): ManageMembershipRequest => {
  let explicitSpace = input.space ? resolveGoogleChatSpaceName(input.space) : undefined;

  if (input.action === 'add') {
    if (input.membership !== undefined || input.role !== undefined) {
      throw googleChatValidationError(
        'membership and role are not supported when action is add; Google adds members with the default role, so call update afterwards to change it.'
      );
    }
    if (!input.member?.trim()) {
      throw googleChatValidationError('member is required when action is add.');
    }
    let parent = explicitSpace ?? resolveGoogleChatSpaceName(undefined, defaultSpace);
    let userName =
      input.memberType === 'group' ? undefined : resolveGoogleChatUserName(input.member);
    if (userName === 'users/app') {
      throw googleChatValidationError(
        'member must be a person; adding a Chat app to a space is not supported by this tool.'
      );
    }
    let data = userName
      ? { member: { name: userName, type: 'HUMAN' } }
      : { groupMember: { name: resolveInitialGroupName(input.member) } };
    return { action: input.action, path: `${parent}/members`, method: 'post', data };
  }

  if (input.memberType !== undefined || input.member !== undefined) {
    throw googleChatValidationError(
      `memberType and member are supported only when action is add, not ${input.action}.`
    );
  }
  let membershipName = resolveMembershipName(input.membership, explicitSpace, defaultSpace);

  if (input.action === 'update') {
    if (!input.role) {
      throw googleChatValidationError('role is required when action is update.');
    }
    return {
      action: input.action,
      path: membershipName,
      method: 'patch',
      params: { updateMask: 'role' },
      data: { name: membershipName, role: input.role }
    };
  }

  if (input.role !== undefined) {
    throw googleChatValidationError('role is supported only when action is update.');
  }
  return {
    action: input.action,
    path: membershipName,
    method: input.action === 'get' ? 'get' : 'delete'
  };
};

export let manageMembership = SlateTool.create(spec, {
  name: 'Manage Membership',
  key: 'manage_membership',
  description:
    'Get, add, update the role of, or remove a member of a Google Chat space. Members can be users (by ID or email) or, in named spaces, Google Groups.',
  instructions: [
    'Use **action** "get" to read one membership; either membership scope is sufficient.',
    'Use **action** "add" with **member** to invite or add a user (user ID, email, or users/{user}) or, with memberType=group, a Google Group (Cloud Identity group ID or groups/{group}). Needs chat.memberships. Users whose auto-accept policy is off receive an invitation and stay INVITED until they accept.',
    'Use **action** "update" with **role** to change a membership role. Needs chat.memberships and space manager rights; ROLE_MANAGER and ROLE_ASSISTANT_MANAGER exist only in named spaces.',
    'Use **action** "remove" to remove a member. Needs chat.memberships and space manager rights to remove others.',
    'For get, update, and remove, **membership** accepts a membership ID, the member user ID or email, users/{user}, or spaces/{space}/members/{member}. Call list_members to discover memberships.'
  ],
  constraints: [
    'Google Groups can be added only to named spaces, not group chats or direct messages.',
    'Removing a member revokes their access to the space.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.manageMembership)
  .authMethods(googleChatActionAuthMethods.manageMembership)
  .input(
    z.object({
      action: z
        .enum(['get', 'add', 'update', 'remove'])
        .describe('Membership operation to perform'),
      space: spaceInput,
      membership: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'For get, update, and remove: membership ID, member user ID or email, users/{user}, or spaces/{space}/members/{member}'
        ),
      memberType: z
        .enum(['user', 'group'])
        .optional()
        .describe('For action=add: whether member is a user (default) or a Google Group'),
      member: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'For action=add: user ID, email, or users/{user}; or, with memberType=group, a Cloud Identity group ID or groups/{group} (group email aliases are not supported)'
        ),
      role: z
        .enum(membershipRoles)
        .optional()
        .describe(
          'For action=update: ROLE_MEMBER, ROLE_MANAGER (Owner in the Chat UI), or ROLE_ASSISTANT_MANAGER (Manager in the Chat UI)'
        )
    })
  )
  .output(
    z.object({
      action: z.enum(['get', 'add', 'update', 'remove']).describe('Completed operation'),
      membershipName: z.string().describe('Full resource name of the target membership'),
      membership: googleChatMembershipOutputSchema
        .optional()
        .describe('Membership returned by Google Chat'),
      removed: z.boolean().optional().describe('True when the member was removed')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildManageMembershipRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatMembership | undefined>(request.path, {
      method: request.method,
      params: request.params,
      data: request.data,
      operation: `${request.action} membership`
    });
    let membership = response?.name ? mapGoogleChatMembership(response) : undefined;
    let membershipName = membership?.membershipName ?? request.path;

    if (request.action === 'remove') {
      return {
        output: { action: request.action, membershipName, membership, removed: true },
        message: `Removed member \`${membershipName}\`.`
      };
    }
    if (!membership) {
      throw googleChatValidationError(
        'Google Chat returned a membership without its required resource name.'
      );
    }

    let verb =
      request.action === 'get' ? 'Retrieved' : request.action === 'add' ? 'Added' : 'Updated';
    return {
      output: { action: request.action, membershipName, membership },
      message: `${verb} membership \`${membershipName}\`${membership.state ? ` (${membership.state})` : ''}.`
    };
  })
  .build();
