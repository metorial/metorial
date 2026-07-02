import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Searches and lists customer users with filtering by name, email, location, and custom properties. Supports wildcard search using \`*\` character. Paginated results (up to 1000 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (zero-based, max 1000 per page)'),
      firstName: z.string().optional().describe('Filter by first name (supports * wildcard)'),
      lastName: z.string().optional().describe('Filter by last name (supports * wildcard)'),
      email: z.string().optional().describe('Filter by email (supports * wildcard)'),
      country: z.string().optional().describe('Filter by country'),
      city: z.string().optional().describe('Filter by city'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Only include users modified since this timestamp'),
      customPropertyName: z.string().optional().describe('Custom property name to filter by'),
      customPropertyValue: z
        .string()
        .optional()
        .describe('Exact value to match for the custom property'),
      customPropertyValueInclusive: z
        .string()
        .optional()
        .describe('Partial/inclusive value to match')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            email: z.string().optional().describe('Email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            country: z.string().optional().describe('Country'),
            city: z.string().optional().describe('City'),
            phoneNumber: z.string().optional().describe('Phone number'),
            reservationCount: z.number().optional().describe('Total reservations')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.listUsers({
      page: ctx.input.page,
      detailLevel: 1,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      country: ctx.input.country,
      city: ctx.input.city,
      modifiedSince: ctx.input.modifiedSince,
      filterName: ctx.input.customPropertyName,
      filterValue: ctx.input.customPropertyValue,
      filterValueInclusive: ctx.input.customPropertyValueInclusive
    });

    let users = (result?.users || result || []).map((u: any) => ({
      userId: String(u.id),
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      country: u.country,
      city: u.city,
      phoneNumber: u.phone_number,
      reservationCount: u.reservation_count != null ? Number(u.reservation_count) : undefined
    }));

    return {
      output: {
        users
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
