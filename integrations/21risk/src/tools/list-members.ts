import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z
  .object({
    memberId: z.string().optional().describe('Unique identifier of the member'),
    name: z.string().optional().describe('Full name of the member'),
    email: z.string().optional().describe('Email address of the member'),
    role: z.string().optional().describe('Role within the organization')
  })
  .passthrough();

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `Retrieve organization members (users) from 21RISK. Returns user information including names, emails, and roles. Useful for identifying audit participants, action assignees, and site contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      orderby: z.string().optional().describe('Sort order (e.g., "Name asc")'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of members'),
      count: z.number().describe('Number of members returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let members = await client.getMembers({
      filter: ctx.input.filter,
      select: ctx.input.select,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = Array.isArray(members) ? members : [members];

    return {
      output: {
        members: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** member(s).`
    };
  })
  .build();
