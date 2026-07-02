import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMobileWorkers = SlateTool.create(spec, {
  name: 'List Mobile Workers',
  key: 'list_mobile_workers',
  description: `Retrieve mobile workers (field users) in a CommCare project. Mobile workers are the users who collect data using the CommCare mobile app.
Returns user details including username, name, contact info, groups, and custom user data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          username: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string(),
          phoneNumber: z.string().nullable(),
          phoneNumbers: z.array(z.string()),
          groups: z.array(z.string()),
          userData: z.record(z.string(), z.any())
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listMobileWorkers({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = result.objects.map(u => ({
      userId: u.id,
      username: u.username,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phoneNumber: u.default_phone_number,
      phoneNumbers: u.phone_numbers,
      groups: u.groups,
      userData: u.user_data
    }));

    return {
      output: {
        users,
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** mobile workers. Returned ${users.length} results.`
    };
  })
  .build();
