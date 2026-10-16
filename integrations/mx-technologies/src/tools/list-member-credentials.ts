import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let paginationSchema = z
  .object({
    currentPage: z.number().optional(),
    perPage: z.number().optional(),
    totalEntries: z.number().optional(),
    totalPages: z.number().optional()
  })
  .optional();

let input = z.object({
  userGuid: z.string().describe('MX GUID of the user'),
  memberGuid: z.string().describe('MX GUID of the member, from List Members'),
  page: z.number().optional().describe('Page number, starting at 1'),
  recordsPerPage: z
    .number()
    .optional()
    .describe('Records per page, from 10 to 1000; default 25')
});

let pagination = (value: Record<string, number> | undefined) =>
  value
    ? {
        currentPage: value.current_page,
        perPage: value.per_page,
        totalEntries: value.total_entries,
        totalPages: value.total_pages
      }
    : undefined;

export let listMemberCredentials = SlateTool.create(spec, {
  name: 'List Member Credentials',
  key: 'list_member_credentials',
  description:
    'List the non-MFA credential field definitions for an existing member. Use their GUIDs with Update Member to supply updated login credentials.',
  tags: { readOnly: true }
})
  .input(input)
  .output(
    z.object({
      credentials: z.array(
        z
          .object({
            guid: z.string().nullable().optional(),
            field_name: z.string().nullable().optional(),
            field_type: z.string().nullable().optional(),
            label: z.string().nullable().optional(),
            type: z.string().nullable().optional(),
            display_order: z.number().nullable().optional()
          })
          .passthrough()
      ),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let result = await client.listMemberCredentials(
      ctx.input.userGuid,
      ctx.input.memberGuid,
      ctx.input
    );
    return {
      output: { credentials: result.credentials, pagination: pagination(result.pagination) },
      message: `Found ${result.credentials.length} credential definitions.`
    };
  })
  .build();

export let listMemberChallenges = SlateTool.create(spec, {
  name: 'List Member Challenges',
  key: 'list_member_challenges',
  description:
    'List the current MFA challenge GUIDs, prompts, options, and image data for a challenged member. Submit answers with Resume MFA Challenge. Returns an empty list when MX reports no active challenges.',
  tags: { readOnly: true }
})
  .input(input)
  .output(
    z.object({
      challenges: z.array(
        z
          .object({
            guid: z.string().nullable().optional(),
            field_name: z.string().nullable().optional(),
            label: z.string().nullable().optional(),
            type: z.string().nullable().optional(),
            image_data: z.string().nullable().optional(),
            options: z.array(z.record(z.string(), z.unknown())).optional(),
            image_options: z.array(z.record(z.string(), z.unknown())).optional()
          })
          .passthrough()
      ),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let result = await client.listMfaChallenges(
      ctx.input.userGuid,
      ctx.input.memberGuid,
      ctx.input
    );
    return {
      output: { challenges: result.challenges, pagination: pagination(result.pagination) },
      message: `Found ${result.challenges.length} MFA challenges.`
    };
  })
  .build();
