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
  description: `Retrieve all staff members in your Re:amaze account. Useful for finding staff emails needed when assigning conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalCount: z.number().describe('Total number of staff members'),
      staff: z.array(staffSchema).describe('List of staff members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listStaff();
    let staff = (result.staff || []).map((s: any) => ({
      name: s.name,
      email: s.email,
      createdAt: s.created_at
    }));

    return {
      output: {
        totalCount: result.total_count || staff.length,
        staff
      },
      message: `Found **${staff.length}** staff members.`
    };
  })
  .build();

export let createStaff = SlateTool.create(spec, {
  name: 'Create Staff Member',
  key: 'create_staff',
  description: `Create a new staff user account in your Re:amaze account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Staff member name'),
      email: z.string().describe('Staff member email address')
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
      email: ctx.input.email
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
