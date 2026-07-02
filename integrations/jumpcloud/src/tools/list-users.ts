import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List and search JumpCloud directory users. Supports filtering by user attributes and pagination for large directories. Returns user profiles including contact information, employment details, and account status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of users to return (1-100, default 100)'),
      skip: z.number().min(0).optional().describe('Number of users to skip for pagination'),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter expression in JumpCloud format, e.g. "email:$eq:user@example.com", "department:$eq:Engineering"'
        ),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return, e.g. "username,email,firstname,lastname"'
        ),
      sort: z
        .string()
        .optional()
        .describe('Field to sort by. Prefix with "-" for descending order, e.g. "-created"')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('Unique user ID'),
            username: z.string().describe('Username'),
            email: z.string().describe('Primary email address'),
            firstname: z.string().optional().describe('First name'),
            lastname: z.string().optional().describe('Last name'),
            displayname: z.string().optional().describe('Display name'),
            state: z
              .string()
              .optional()
              .describe('Account state: ACTIVATED, STAGED, or SUSPENDED'),
            activated: z.boolean().optional().describe('Whether the account is activated'),
            company: z.string().optional().describe('Company name'),
            department: z.string().optional().describe('Department'),
            jobTitle: z.string().optional().describe('Job title'),
            employeeIdentifier: z.string().optional().describe('Employee ID'),
            created: z.string().optional().describe('Account creation timestamp'),
            suspended: z.boolean().optional().describe('Whether the account is suspended')
          })
        )
        .describe('List of users'),
      totalCount: z.number().describe('Total number of users matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      filter: ctx.input.filter,
      fields: ctx.input.fields,
      sort: ctx.input.sort
    });

    let users = result.results.map(u => ({
      userId: u._id,
      username: u.username,
      email: u.email,
      firstname: u.firstname,
      lastname: u.lastname,
      displayname: u.displayname,
      state: u.state,
      activated: u.activated,
      company: u.company,
      department: u.department,
      jobTitle: u.jobTitle,
      employeeIdentifier: u.employeeIdentifier,
      created: u.created,
      suspended: u.suspended
    }));

    return {
      output: {
        users,
        totalCount: result.totalCount
      },
      message: `Found **${result.totalCount}** users. Returned **${users.length}** users${ctx.input.skip ? ` (skipped ${ctx.input.skip})` : ''}.`
    };
  })
  .build();
