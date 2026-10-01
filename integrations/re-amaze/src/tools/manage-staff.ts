import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let staffSchema = z.object({
  name: z.string().describe('Staff member name'),
  email: z.string().describe('Staff member email'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
});

export let listStaff = SlateTool.create(spec, {
  name: 'List Staff',
  key: 'list_staff',
  description: `Retrieve a page of staff members in your Re:amaze account. Useful for finding staff emails needed when assigning conversations. Use pageCount to retrieve every page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number for pagination; defaults to the first page')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of staff members'),
      pageSize: z.number().optional().describe('Number of staff members per page'),
      pageCount: z.number().optional().describe('Total number of pages'),
      staff: z.array(staffSchema).describe('List of staff members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listStaff(ctx.input.page);
    let staff = (result.staff || []).map((s: any) => ({
      name: s.name,
      email: s.email,
      createdAt: s.created_at
    }));

    return {
      output: {
        totalCount: result.total_count ?? staff.length,
        pageSize: result.page_size,
        pageCount: result.page_count,
        staff
      },
      message: `Found **${staff.length}** staff members.`
    };
  })
  .build();

export let createStaff = SlateTool.create(spec, {
  name: 'Create Staff Member',
  key: 'create_staff',
  description: `Create a new staff user account in your Re:amaze account. This can increase your monthly subscription cost. Re:amaze does not send an invitation email, and the user must change their password at first login.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Staff member name'),
      email: z.string().describe('Staff member email address'),
      password: z
        .string()
        .optional()
        .describe(
          'Temporary password for the staff member. The user is asked to change it at first login.'
        )
    })
  )
  .output(staffSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.createStaff({
      name: ctx.input.name,
      email: ctx.input.email,
      password: ctx.input.password
    });

    let s = result.staff || result;

    return {
      output: {
        name: s.name,
        email: s.email,
        createdAt: s.created_at
      },
      message: `Created staff member **${s.name}** (${s.email}).`
    };
  })
  .build();
