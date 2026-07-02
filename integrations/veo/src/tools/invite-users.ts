import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inviteUsers = SlateTool.create(spec, {
  name: 'Invite Users',
  key: 'invite_users',
  description: `Invite one or more users to your VEO organisation via email. Users can optionally be assigned admin rights and added to specific groups/communities on invitation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organisationId: z.string().describe('ID of the organisation to invite users to'),
      users: z
        .array(
          z.object({
            email: z.string().describe('Email address of the user to invite'),
            isOrgAdmin: z
              .boolean()
              .optional()
              .default(false)
              .describe('Whether to grant organisation admin rights'),
            communities: z
              .array(z.number())
              .optional()
              .describe('Group/community IDs to add the user to upon invitation')
          })
        )
        .describe('Array of users to invite')
    })
  )
  .output(
    z.object({
      totalInvites: z.number().describe('Total number of invitations processed'),
      successList: z.array(z.string()).describe('Emails of newly invited users'),
      errorList: z.array(z.string()).describe('Invalid or errored email entries'),
      alreadyInOrganisationList: z
        .array(z.string())
        .describe('Emails of users already in the organisation'),
      existingUserAdded: z
        .array(z.string())
        .describe('Existing VEO users newly added to the organisation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.inviteUsers({
      organisationId: ctx.input.organisationId,
      users: ctx.input.users
    });

    let successList = result.SuccessList ?? result.successList ?? [];
    let errorList = result.ErrorList ?? result.errorList ?? [];
    let alreadyInOrganisationList =
      result.AlreadyInOrganisationList ?? result.alreadyInOrganisationList ?? [];
    let existingUserAdded =
      result.ExistingUserAddedMembershipToOrganisation ??
      result.existingUserAddedMembershipToOrganisation ??
      [];

    return {
      output: {
        totalInvites: result.TotalInvites ?? result.totalInvites ?? ctx.input.users.length,
        successList,
        errorList,
        alreadyInOrganisationList,
        existingUserAdded
      },
      message: `Invited **${successList.length}** new users. ${errorList.length > 0 ? `${errorList.length} errors.` : ''} ${alreadyInOrganisationList.length > 0 ? `${alreadyInOrganisationList.length} already in org.` : ''}`
    };
  })
  .build();
