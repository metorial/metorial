import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier for the member'),
  id: z.string().optional().nullable().describe('Partner-defined identifier'),
  userGuid: z.string().optional().describe('GUID of the owning user'),
  institutionCode: z.string().optional().describe('Code of the connected institution'),
  name: z.string().optional().nullable().describe('Name of the institution connection'),
  connectionStatus: z
    .string()
    .optional()
    .nullable()
    .describe('Current connection status (CONNECTED, CHALLENGED, FAILED, etc.)'),
  isBeingAggregated: z
    .boolean()
    .optional()
    .describe('Whether aggregation is currently in progress'),
  aggregatedAt: z.string().optional().nullable().describe('Timestamp of last aggregation'),
  successfullyAggregatedAt: z
    .string()
    .optional()
    .nullable()
    .describe('Timestamp of last successful aggregation'),
  metadata: z.string().optional().nullable().describe('Partner-defined metadata')
});

export let createMember = SlateTool.create(spec, {
  name: 'Create Member',
  key: 'create_member',
  description: `Connect a user to a financial institution by creating a member. Requires the institution code and user credentials. Aggregation starts automatically unless skipped. Use **Search Institutions** to find the institution code and **List Institution Credentials** to determine required credential fields.`,
  instructions: [
    'First search for the institution to get its code, then list its credentials to know which credential GUIDs to include.',
    'Do not create duplicate members for the same institution with the same credentials on a single user.'
  ],
  constraints: ['Maximum 25 members per user in both environments.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      institutionCode: z.string().describe('Code of the financial institution to connect'),
      credentials: z
        .array(
          z.object({
            guid: z
              .string()
              .describe("Credential GUID from the institution's credential requirements"),
            value: z.string().describe('Value for this credential (e.g., username, password)')
          })
        )
        .describe('Array of credentials required by the institution'),
      id: z.string().optional().describe('Custom identifier for this member'),
      metadata: z.string().optional().describe('Custom metadata string'),
      skipAggregation: z
        .boolean()
        .optional()
        .describe('If true, skip automatic aggregation after creation')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.createMember(ctx.input.userGuid, {
      institutionCode: ctx.input.institutionCode,
      credentials: ctx.input.credentials,
      id: ctx.input.id,
      metadata: ctx.input.metadata,
      skipAggregation: ctx.input.skipAggregation
    });

    return {
      output: {
        guid: member.guid,
        id: member.id,
        userGuid: member.user_guid,
        institutionCode: member.institution_code,
        name: member.name,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated,
        aggregatedAt: member.aggregated_at,
        successfullyAggregatedAt: member.successfully_aggregated_at,
        metadata: member.metadata
      },
      message: `Created member **${member.guid}** for institution \`${member.institution_code}\`. Connection status: **${member.connection_status}**.`
    };
  })
  .build();

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List all members (financial institution connections) for a given user. Returns connection status, aggregation state, and institution details for each member.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      page: z.number().optional().describe('Page number for pagination'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 100)')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let result = await client.listMembers(ctx.input.userGuid, {
      page: ctx.input.page,
      recordsPerPage: ctx.input.recordsPerPage
    });

    let members = (result.members || []).map((m: any) => ({
      guid: m.guid,
      id: m.id,
      userGuid: m.user_guid,
      institutionCode: m.institution_code,
      name: m.name,
      connectionStatus: m.connection_status,
      isBeingAggregated: m.is_being_aggregated,
      aggregatedAt: m.aggregated_at,
      successfullyAggregatedAt: m.successfully_aggregated_at,
      metadata: m.metadata
    }));

    return {
      output: {
        members,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${members.length}** members for user ${ctx.input.userGuid}.`
    };
  })
  .build();

export let readMemberStatus = SlateTool.create(spec, {
  name: 'Read Member Status',
  key: 'read_member_status',
  description: `Check the current connection and aggregation status of a member. Returns whether the member is connected, being aggregated, challenged (MFA), or has encountered an error.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.readMemberStatus(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: {
        guid: member.guid,
        id: member.id,
        userGuid: member.user_guid,
        institutionCode: member.institution_code,
        name: member.name,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated,
        aggregatedAt: member.aggregated_at,
        successfullyAggregatedAt: member.successfully_aggregated_at,
        metadata: member.metadata
      },
      message: `Member **${member.guid}** status: **${member.connection_status}**. Aggregating: ${member.is_being_aggregated}.`
    };
  })
  .build();

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update a member's credentials, ID, or metadata. Useful for re-authenticating a member when credentials have changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member to update'),
      credentials: z
        .array(
          z.object({
            guid: z.string().describe('Credential GUID'),
            value: z.string().describe('New credential value')
          })
        )
        .optional()
        .describe('Updated credentials'),
      id: z.string().optional().describe('New custom identifier'),
      metadata: z.string().optional().describe('New metadata string')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.updateMember(ctx.input.userGuid, ctx.input.memberGuid, {
      credentials: ctx.input.credentials,
      id: ctx.input.id,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        guid: member.guid,
        id: member.id,
        userGuid: member.user_guid,
        institutionCode: member.institution_code,
        name: member.name,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated,
        aggregatedAt: member.aggregated_at,
        successfullyAggregatedAt: member.successfully_aggregated_at,
        metadata: member.metadata
      },
      message: `Updated member **${member.guid}**.`
    };
  })
  .build();

export let deleteMember = SlateTool.create(spec, {
  name: 'Delete Member',
  key: 'delete_member',
  description: `Delete a member and all associated data (accounts, transactions, holdings). This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    await client.deleteMember(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: { deleted: true },
      message: `Deleted member **${ctx.input.memberGuid}** and all associated data.`
    };
  })
  .build();

export let aggregateMember = SlateTool.create(spec, {
  name: 'Aggregate Member',
  key: 'aggregate_member',
  description: `Trigger a manual aggregation for a member to fetch the latest account and transaction data from the connected financial institution. MX automatically aggregates every 24 hours, but you can trigger on-demand aggregation with this tool.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member to aggregate')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.aggregateMember(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: {
        guid: member.guid,
        id: member.id,
        userGuid: member.user_guid,
        institutionCode: member.institution_code,
        name: member.name,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated,
        aggregatedAt: member.aggregated_at,
        successfullyAggregatedAt: member.successfully_aggregated_at,
        metadata: member.metadata
      },
      message: `Triggered aggregation for member **${member.guid}**. Status: **${member.connection_status}**.`
    };
  })
  .build();

export let resumeMfaChallenge = SlateTool.create(spec, {
  name: 'Resume MFA Challenge',
  key: 'resume_mfa_challenge',
  description: `Answer multi-factor authentication (MFA) challenges for a member whose connection status is CHALLENGED. First use **Read Member Status** to check if MFA is needed, then provide the challenge responses.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member'),
      challenges: z
        .array(
          z.object({
            guid: z.string().describe('Challenge GUID'),
            value: z.string().describe('Answer to the challenge')
          })
        )
        .describe('Array of challenge responses')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.resumeMfaChallenge(
      ctx.input.userGuid,
      ctx.input.memberGuid,
      ctx.input.challenges
    );

    return {
      output: {
        guid: member.guid,
        id: member.id,
        userGuid: member.user_guid,
        institutionCode: member.institution_code,
        name: member.name,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated,
        aggregatedAt: member.aggregated_at,
        successfullyAggregatedAt: member.successfully_aggregated_at,
        metadata: member.metadata
      },
      message: `Submitted MFA answers for member **${member.guid}**. Status: **${member.connection_status}**.`
    };
  })
  .build();
