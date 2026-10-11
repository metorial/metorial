import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMembers = SlateTool.create(spec, {
  name: 'Manage Members',
  key: 'manage_members',
  description: `Query and retrieve site members on a Wix site.
Use **action** to specify the operation: \`list\` or \`get\`.
Members are registered users of the site with login credentials, profiles, and associated contact records.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Operation to perform'),
      memberId: z.string().optional().describe('Member ID (required for get)'),
      fieldset: z
        .enum(['PUBLIC', 'EXTENDED', 'FULL'])
        .optional()
        .describe(
          'Member fields to return: PUBLIC (profile only), EXTENDED (adds loginEmail and status), or FULL (all fields, default)'
        ),
      search: z.string().optional().describe('Free-text search on member nickname (for list)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for list action, e.g. {"loginEmail": "jane@example.com"}'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for list action'),
      limit: z.number().optional().describe('Max items to return (default 50)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      member: z.any().optional().describe('Single member data'),
      members: z.array(z.any()).optional().describe('List of members'),
      totalResults: z.number().optional().describe('Total number of members')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);
    let fieldset = ctx.input.fieldset ?? 'FULL';

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.queryMembers({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          fieldsets: [fieldset],
          search: ctx.input.search
        });
        let members = result.members || [];
        return {
          output: { members, totalResults: result.metadata?.total },
          message: `Found **${members.length}** members`
        };
      }
      case 'get': {
        if (!ctx.input.memberId)
          throw createApiServiceError('memberId is required for get action');
        let result = await client.getMember(ctx.input.memberId, [fieldset]);
        return {
          output: { member: result.member },
          message: `Retrieved member **${result.member?.loginEmail || ctx.input.memberId}**`
        };
      }
    }
  })
  .build();
