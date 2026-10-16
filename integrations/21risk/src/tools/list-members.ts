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
      nextLink: z
        .string()
        .optional()
        .describe(
          'Continuation URL returned by this tool. Supply it alone to retrieve the next page.'
        ),
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
      nextLink: z
        .string()
        .optional()
        .describe('Provider continuation URL for the next page, when supplied'),
      totalCount: z
        .number()
        .optional()
        .describe('Provider total matching count, when supplied'),
      count: z.number().describe('Number of members returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let members = await client.getMembers({
      nextLink: ctx.input.nextLink,
      filter: ctx.input.filter,
      select: ctx.input.select,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = members.records;

    return {
      output: {
        members: results,
        count: results.length,
        nextLink: members.nextLink,
        totalCount: members.totalCount
      },
      message: `Retrieved **${results.length}** member(s).`
    };
  })
  .build();
