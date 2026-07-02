import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageAudienceLists = SlateTool.create(spec, {
  name: 'Manage Audience Lists',
  key: 'manage_audience_lists',
  description: `Create, update, or remove user lists (audience segments) for targeting. Supports CRM-based customer lists, rule-based lists, and remarketing lists.

User lists can be applied to campaigns or ad groups for audience targeting, bid adjustments, or exclusions.`,
  instructions: [
    'For CRM-based lists, the membershipLifeSpan is in days (set to 10000 for no expiration).',
    'Membership status can be OPEN (accepting new members) or CLOSED (not accepting).'
  ]
})
  .scopes(googleAdsActionScopes.manageAudienceLists)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      userListId: z.string().optional().describe('User list ID (required for update/remove)'),
      name: z.string().optional().describe('User list name'),
      description: z.string().optional().describe('User list description'),
      membershipLifeSpan: z
        .number()
        .optional()
        .describe('Number of days a user stays in the list (set 10000 for unlimited)'),
      membershipStatus: z
        .enum(['OPEN', 'CLOSED'])
        .optional()
        .describe('Whether the list is open or closed for new members'),
      listType: z
        .enum(['CRM_BASED', 'RULE_BASED', 'LOGICAL'])
        .optional()
        .describe('Type of user list (required for create)'),
      crmBasedUserList: z
        .object({
          uploadKeyType: z
            .enum(['CONTACT_INFO', 'CRM_ID', 'MOBILE_ADVERTISING_ID'])
            .optional()
            .describe('Type of CRM data'),
          dataSourceType: z
            .enum(['FIRST_PARTY', 'THIRD_PARTY_CREDIT_BUREAU', 'THIRD_PARTY_VOTER_FILE'])
            .optional()
            .describe('Source of the CRM data')
        })
        .optional()
        .describe('CRM-based user list configuration')
    })
  )
  .output(
    z.object({
      userListResourceName: z.string().optional().describe('Resource name of the user list'),
      mutateResults: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId, operation } = ctx.input;
    let cid = customerId.replace(/-/g, '');

    if (operation === 'remove') {
      if (!ctx.input.userListId) throw new Error('userListId required');
      let result = await client.mutateUserLists(cid, [
        {
          remove: `customers/${cid}/userLists/${ctx.input.userListId}`
        }
      ]);
      return {
        output: { mutateResults: result },
        message: `User list **${ctx.input.userListId}** removed.`
      };
    }

    if (operation === 'create') {
      let listData: Record<string, any> = {
        name: ctx.input.name,
        membershipStatus: ctx.input.membershipStatus || 'OPEN'
      };
      if (ctx.input.description) listData.description = ctx.input.description;
      if (ctx.input.membershipLifeSpan)
        listData.membershipLifeSpan = ctx.input.membershipLifeSpan;
      if (ctx.input.listType === 'CRM_BASED' && ctx.input.crmBasedUserList) {
        listData.crmBasedUserList = ctx.input.crmBasedUserList;
      }

      let result = await client.mutateUserLists(cid, [{ create: listData }]);
      return {
        output: {
          userListResourceName: result.results?.[0]?.resourceName,
          mutateResults: result
        },
        message: `User list **${ctx.input.name}** created.`
      };
    }

    // Update
    if (!ctx.input.userListId) throw new Error('userListId required');
    let resourceName = `customers/${cid}/userLists/${ctx.input.userListId}`;
    let updateData: Record<string, any> = { resourceName };
    let maskFields: string[] = [];

    if (ctx.input.name !== undefined) {
      updateData.name = ctx.input.name;
      maskFields.push('name');
    }
    if (ctx.input.description !== undefined) {
      updateData.description = ctx.input.description;
      maskFields.push('description');
    }
    if (ctx.input.membershipLifeSpan !== undefined) {
      updateData.membershipLifeSpan = ctx.input.membershipLifeSpan;
      maskFields.push('membershipLifeSpan');
    }
    if (ctx.input.membershipStatus !== undefined) {
      updateData.membershipStatus = ctx.input.membershipStatus;
      maskFields.push('membershipStatus');
    }

    let result = await client.mutateUserLists(cid, [
      {
        update: updateData,
        updateMask: maskFields.join(',')
      }
    ]);

    return {
      output: { userListResourceName: resourceName, mutateResults: result },
      message: `User list **${ctx.input.userListId}** updated.`
    };
  })
  .build();
