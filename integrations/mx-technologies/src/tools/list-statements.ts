import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let statementSchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier'),
  memberGuid: z.string().optional().nullable().describe('GUID of the member'),
  userGuid: z.string().optional().describe('GUID of the owning user'),
  accountGuid: z.string().optional().nullable().describe('GUID of the account'),
  contentHash: z.string().optional().nullable().describe('Content hash for change detection'),
  createdAt: z.string().optional().nullable().describe('Creation timestamp'),
  updatedAt: z.string().optional().nullable().describe('Last update timestamp'),
  uri: z.string().optional().nullable().describe('URI to download the statement PDF')
});

export let listStatements = SlateTool.create(spec, {
  name: 'List Statements',
  key: 'list_statements',
  description: `List available account statements for a member. Statements must first be fetched using **Fetch Statements** before they appear here. Returns statement metadata including download URI.`,
  instructions: [
    'Use the Fetch Statements tool first to initiate statement retrieval, then list them once the fetch job completes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member'),
      page: z.number().optional().describe('Page number'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 100)')
    })
  )
  .output(
    z.object({
      statements: z.array(statementSchema),
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
    let result = await client.listStatements(ctx.input.userGuid, ctx.input.memberGuid, {
      page: ctx.input.page,
      recordsPerPage: ctx.input.recordsPerPage
    });

    let statements = (result.statements || []).map((s: any) => ({
      guid: s.guid,
      memberGuid: s.member_guid,
      userGuid: s.user_guid,
      accountGuid: s.account_guid,
      contentHash: s.content_hash,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      uri: s.uri
    }));

    return {
      output: {
        statements,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${statements.length}** statements for member ${ctx.input.memberGuid}.`
    };
  })
  .build();

export let fetchStatements = SlateTool.create(spec, {
  name: 'Fetch Statements',
  key: 'fetch_statements',
  description: `Initiate a statement retrieval job for a member. This triggers MX to fetch account statements from the connected institution. Once the job completes, use **List Statements** to access the results.`,
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
  .output(
    z.object({
      memberGuid: z.string().optional(),
      connectionStatus: z.string().optional().nullable(),
      isBeingAggregated: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.fetchStatements(ctx.input.userGuid, ctx.input.memberGuid);

    return {
      output: {
        memberGuid: member.guid,
        connectionStatus: member.connection_status,
        isBeingAggregated: member.is_being_aggregated
      },
      message: `Statement fetch initiated for member **${member.guid}**. Check status and then list statements when complete.`
    };
  })
  .build();
