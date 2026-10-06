import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Native user identifier from the response map'),
  totalScore: z.string().optional().describe('Current security score including MFA'),
  legacyTotalScore: z.string().optional().describe('Legacy security score excluding MFA'),
  passwordResetRequired: z
    .boolean()
    .optional()
    .describe('Whether the native account requires password reset'),
  username: z.string().describe('Email address of the user'),
  fullname: z.string().optional().describe('Full name of the user'),
  groups: z.array(z.string()).optional().describe('Groups the user belongs to'),
  isAdmin: z.boolean().optional().describe('Whether the user is an admin'),
  disabled: z.boolean().optional().describe('Whether the user account is disabled'),
  neverLoggedIn: z.boolean().optional().describe('Whether the user has never logged in'),
  lastLogin: z.string().optional().describe('Timestamp of last login'),
  lastPasswordChange: z.string().optional().describe('Timestamp of last password change'),
  created: z.string().optional().describe('Account creation timestamp'),
  masterPasswordStrength: z.string().optional().describe('Master password strength score'),
  multifactor: z.string().optional().describe('Multifactor authentication method'),
  siteCount: z.number().optional().describe('Number of stored sites'),
  noteCount: z.number().optional().describe('Number of stored notes'),
  formFillCount: z.number().optional().describe('Number of stored form fills'),
  applicationCount: z.number().optional().describe('Number of stored applications'),
  attachmentCount: z.number().optional().describe('Number of stored attachments')
});

export let getUsers = SlateTool.create(spec, {
  name: 'Get Users',
  key: 'get_users',
  description: `Retrieve user account data from LastPass Enterprise. Fetch a specific user by email or one page of administrative user metadata, login history, group memberships, and account status. This does not read vault contents.`,
  instructions: [
    'Provide **username** (email) to look up a specific user.',
    'Omit **username** to retrieve a page of enterprise users. Continue with **nextPageIndex** when returned. Missing native fields remain omitted.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe('Email address of a specific user to retrieve; omit for a page of users'),
      pageIndex: z
        .number()
        .int()
        .nonnegative()
        .default(0)
        .describe('Native zero-based user page index'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(2000)
        .default(500)
        .describe('Users per page; at most 2000 to prevent omitted details'),
      disabled: z
        .boolean()
        .optional()
        .describe(
          'Filter disabled or enrolled accounts; false is an explicit enrolled filter'
        ),
      admin: z
        .boolean()
        .optional()
        .describe('Filter admin or non-admin accounts; false is an explicit non-admin filter')
    })
  )
  .output(
    z.object({
      pageIndex: z.number().describe('Returned zero-based page index'),
      pageSize: z.number().describe('Requested maximum user page size'),
      total: z.number().optional().describe('Native total user count, if returned'),
      count: z.number().optional().describe('Native returned count, if returned'),
      nextPageIndex: z
        .number()
        .optional()
        .describe('Next user page index when native total confirms more results'),
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

    let result = await client.getUserData(
      ctx.input.username,
      ctx.input.pageIndex,
      ctx.input.pageSize,
      ctx.input.disabled,
      ctx.input.admin
    );

    let users = Object.entries(result.Users).map(([userId, u]) => ({
      userId,
      username: u.username,
      ...pickDefined({
        fullname: u.fullname,
        groups: u.groups,
        isAdmin: u.admin,
        disabled: u.disabled,
        neverLoggedIn: u.neverloggedin,
        lastLogin: u.last_login,
        lastPasswordChange: u.last_pw_change,
        created: u.created,
        masterPasswordStrength: u.mpstrength,
        multifactor: u.multifactor,
        siteCount: u.sites,
        noteCount: u.notes,
        formFillCount: u.formfills,
        applicationCount: u.applications,
        attachmentCount: u.attachments,
        totalScore: u.totalscore,
        legacyTotalScore: u.legacytotalscore,
        passwordResetRequired: u.password_reset_required
      })
    }));

    let message = ctx.input.username
      ? `Retrieved data for user **${ctx.input.username}**.`
      : `Retrieved **${users.length}** user(s) from LastPass.`;

    return {
      output: {
        pageIndex: ctx.input.pageIndex,
        pageSize: ctx.input.pageSize,
        total: result.total,
        count: result.count,
        nextPageIndex:
          result.total !== undefined &&
          users.length > 0 &&
          ctx.input.pageIndex * ctx.input.pageSize + users.length < result.total
            ? ctx.input.pageIndex + 1
            : undefined,
        users,
        groups: result.Groups || undefined,
        invitedUsers: result.Invited || undefined
      },
      message
    };
  })
  .build();
