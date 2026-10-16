import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let memberStatusSchema = z.object({
  memberGuid: z.string().optional(),
  connectionStatus: z.string().optional().nullable(),
  isBeingAggregated: z.boolean().optional()
});

export let verifyMember = SlateTool.create(spec, {
  name: 'Verify Account',
  key: 'verify_account',
  description: `Initiate instant account verification (IAV) for a member. Starts an asynchronous process to retrieve account and routing numbers; use Read Member Status to follow progress. Use this for money movement and account funding use cases.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member to verify')
    })
  )
  .output(memberStatusSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.verifyMember(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: {
        memberGuid: member.guid ?? undefined,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated ?? undefined
      },
      message: `Verification initiated for member **${member.guid}**. Status: **${member.connection_status}**.`
    };
  })
  .build();

export let identifyMember = SlateTool.create(spec, {
  name: 'Identify Account Owner',
  key: 'identify_account_owner',
  description: `Start account owner identification for a member. After it completes, use List Account Owners to retrieve the name, address, email, and phone number. Useful for identity verification (IDV) and Know Your Customer (KYC) processes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member to identify')
    })
  )
  .output(memberStatusSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.identifyMember(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: {
        memberGuid: member.guid ?? undefined,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated ?? undefined
      },
      message: `Identification initiated for member **${member.guid}**. Status: **${member.connection_status}**.`
    };
  })
  .build();

export let listAccountOwners = SlateTool.create(spec, {
  name: 'List Account Owners',
  key: 'list_account_owners',
  description: `List account owner identity data for a member after identification has completed. Returns name, address, email, and phone number for KYC/IDV purposes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member'),
      page: z.number().optional().describe('Page number, starting at 1'),
      recordsPerPage: z.number().optional().describe('Records per page, from 10 to 1000')
    })
  )
  .output(
    z.object({
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional(),
      accountOwners: z.array(
        z.object({
          guid: z.string().optional(),
          accountGuid: z.string().optional().nullable(),
          memberGuid: z.string().optional().nullable(),
          userGuid: z.string().optional(),
          firstName: z.string().optional().nullable(),
          lastName: z.string().optional().nullable(),
          email: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          address: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          postalCode: z.string().optional().nullable(),
          country: z.string().optional().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let result = await client.listAccountOwners(
      ctx.input.userGuid,
      ctx.input.memberGuid,
      ctx.input
    );

    let mapped = result.accountOwners.map((o: any) => ({
      guid: o.guid ?? undefined,
      accountGuid: o.account_guid,
      memberGuid: o.member_guid,
      userGuid: o.user_guid ?? undefined,
      firstName: o.first_name,
      lastName: o.last_name,
      email: o.email,
      phone: o.phone,
      address: o.address,
      city: o.city,
      state: o.state,
      postalCode: o.postal_code,
      country: o.country
    }));

    return {
      output: {
        accountOwners: mapped,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${mapped.length}** account owner(s) for member ${ctx.input.memberGuid}.`
    };
  })
  .build();

export let checkBalance = SlateTool.create(spec, {
  name: 'Check Balance',
  key: 'check_balance',
  description: `Initiate a balance check for a member. This fetches the latest account balances without a full aggregation. Useful for verifying balances before payment processing.`,
  constraints: ['Balance checks are limited to 5 requests every 2 hours per member.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member')
    })
  )
  .output(memberStatusSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.checkBalance(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: {
        memberGuid: member.guid ?? undefined,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated ?? undefined
      },
      message: `Balance check initiated for member **${member.guid}**. Status: **${member.connection_status}**.`
    };
  })
  .build();

export let extendHistory = SlateTool.create(spec, {
  name: 'Extend Transaction History',
  key: 'extend_transaction_history',
  description: `Request extended transaction history for a member beyond the default aggregation window. Useful for underwriting, financial analysis, and building comprehensive spending profiles.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member')
    })
  )
  .output(memberStatusSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.extendHistory(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: {
        memberGuid: member.guid ?? undefined,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated ?? undefined
      },
      message: `Extended history request initiated for member **${member.guid}**. Status: **${member.connection_status}**.`
    };
  })
  .build();
