import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve Stability AI account information and credit balance. Returns the account email, profile picture, organizations, and current credit balance for monitoring API usage.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique user identifier.'),
      email: z.string().describe('Account email address.'),
      profilePicture: z.string().describe('URL of the account profile picture.'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization ID.'),
            organizationName: z.string().describe('Organization name.'),
            role: z.string().describe('User role in the organization.'),
            isDefault: z.boolean().describe('Whether this is the default organization.')
          })
        )
        .describe('Organizations the user belongs to.'),
      credits: z.number().describe('Current credit balance for API usage.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [account, balance] = await Promise.all([client.getAccount(), client.getBalance()]);

    return {
      output: {
        userId: account.id,
        email: account.email,
        profilePicture: account.profilePicture,
        organizations: account.organizations.map(org => ({
          organizationId: org.id,
          organizationName: org.name,
          role: org.role,
          isDefault: org.isDefault
        })),
        credits: balance.credits
      },
      message: `Account **${account.email}** has **${balance.credits}** credits remaining.`
    };
  })
  .build();
