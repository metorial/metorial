import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific user by their email address or unique user ID. Returns full profile data including contact info, organization details, and account status.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.getUser)
  .input(
    z.object({
      userKey: z.string().describe('Email address or unique user ID of the user to retrieve')
    })
  )
  .output(
    z.object({
      userId: z.string().optional(),
      primaryEmail: z.string().optional(),
      name: z
        .object({
          givenName: z.string().optional(),
          familyName: z.string().optional(),
          fullName: z.string().optional()
        })
        .optional(),
      isAdmin: z.boolean().optional(),
      isDelegatedAdmin: z.boolean().optional(),
      suspended: z.boolean().optional(),
      suspensionReason: z.string().optional(),
      archived: z.boolean().optional(),
      orgUnitPath: z.string().optional(),
      creationTime: z.string().optional(),
      lastLoginTime: z.string().optional(),
      isEnrolledIn2Sv: z.boolean().optional(),
      isEnforcedIn2Sv: z.boolean().optional(),
      recoveryEmail: z.string().optional(),
      recoveryPhone: z.string().optional(),
      emails: z.array(z.any()).optional(),
      phones: z.array(z.any()).optional(),
      addresses: z.array(z.any()).optional(),
      organizations: z.array(z.any()).optional(),
      aliases: z.array(z.string()).optional(),
      agreedToTerms: z.boolean().optional(),
      changePasswordAtNextLogin: z.boolean().optional(),
      ipWhitelisted: z.boolean().optional(),
      customSchemas: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let u = await client.getUser(ctx.input.userKey);

    return {
      output: {
        userId: u.id,
        primaryEmail: u.primaryEmail,
        name: u.name
          ? {
              givenName: u.name.givenName,
              familyName: u.name.familyName,
              fullName: u.name.fullName
            }
          : undefined,
        isAdmin: u.isAdmin,
        isDelegatedAdmin: u.isDelegatedAdmin,
        suspended: u.suspended,
        suspensionReason: u.suspensionReason,
        archived: u.archived,
        orgUnitPath: u.orgUnitPath,
        creationTime: u.creationTime,
        lastLoginTime: u.lastLoginTime,
        isEnrolledIn2Sv: u.isEnrolledIn2Sv,
        isEnforcedIn2Sv: u.isEnforcedIn2Sv,
        recoveryEmail: u.recoveryEmail,
        recoveryPhone: u.recoveryPhone,
        emails: u.emails,
        phones: u.phones,
        addresses: u.addresses,
        organizations: u.organizations,
        aliases: u.aliases,
        agreedToTerms: u.agreedToTerms,
        changePasswordAtNextLogin: u.changePasswordAtNextLogin,
        ipWhitelisted: u.ipWhitelisted,
        customSchemas: u.customSchemas
      },
      message: `Retrieved user **${u.primaryEmail}** (${u.name?.fullName || 'N/A'}).${u.suspended ? ' ⚠️ Account is suspended.' : ''}`
    };
  })
  .build();
