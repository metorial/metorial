import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  username: z.string().describe('Email address of the user'),
  fullname: z.string().describe('Full name of the user'),
  groups: z.array(z.string()).describe('Groups the user belongs to'),
  isAdmin: z.boolean().describe('Whether the user is an admin'),
  disabled: z.boolean().describe('Whether the user account is disabled'),
  neverLoggedIn: z.boolean().describe('Whether the user has never logged in'),
  lastLogin: z.string().describe('Timestamp of last login'),
  lastPasswordChange: z.string().describe('Timestamp of last password change'),
  created: z.string().describe('Account creation timestamp'),
  masterPasswordStrength: z.string().describe('Master password strength score'),
  multifactor: z.string().describe('Multifactor authentication method'),
  siteCount: z.number().describe('Number of stored sites'),
  noteCount: z.number().describe('Number of stored notes'),
  formFillCount: z.number().describe('Number of stored form fills'),
  applicationCount: z.number().describe('Number of stored applications'),
  attachmentCount: z.number().describe('Number of stored attachments')
});

export let getUsers = SlateTool.create(spec, {
  name: 'Get Users',
  key: 'get_users',
  description: `Retrieve user account data from LastPass Enterprise. Fetch a specific user by email or list all users with their security scores, login history, group memberships, and account status.`,
  instructions: [
    'Provide **username** (email) to look up a specific user.',
    'Omit **username** to retrieve all users in the enterprise account.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      username: z.string().optional().describe('Email address of a specific user to retrieve')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of user accounts'),
      groups: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Map of group names to lists of member usernames'),
      invitedUsers: z
        .array(z.string())
        .optional()
        .describe('List of invited but not yet enrolled user emails')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let result = await client.getUserData(ctx.input.username);

    let users = Object.entries(result.Users || {}).map(([_id, u]) => ({
      username: u.username || '',
      fullname: u.fullname || '',
      groups: u.groups || [],
      isAdmin: !!u.admin,
      disabled: !!u.disabled,
      neverLoggedIn: !!u.neverloggedin,
      lastLogin: u.last_login || '',
      lastPasswordChange: u.last_pw_change || '',
      created: u.created || '',
      masterPasswordStrength: u.mpstrength || '',
      multifactor: u.multifactor || '',
      siteCount: Number(u.sites) || 0,
      noteCount: Number(u.notes) || 0,
      formFillCount: Number(u.formfills) || 0,
      applicationCount: Number(u.applications) || 0,
      attachmentCount: Number(u.attachments) || 0
    }));

    let message = ctx.input.username
      ? `Retrieved data for user **${ctx.input.username}**.`
      : `Retrieved **${users.length}** user(s) from LastPass.`;

    return {
      output: {
        users,
        groups: result.Groups || undefined,
        invitedUsers: result.Invited || undefined
      },
      message
    };
  })
  .build();
