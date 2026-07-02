import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve system users (managers, administrators) from Simla.com. Useful for finding manager IDs to assign to orders or customers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .object({
          status: z.string().optional().describe('Filter by status'),
          isManager: z.boolean().optional().describe('Filter by manager role'),
          isAdmin: z.boolean().optional().describe('Filter by admin role'),
          active: z.boolean().optional().describe('Filter by active status')
        })
        .optional(),
      page: z.number().optional(),
      limit: z.number().optional()
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          status: z.string().optional(),
          online: z.boolean().optional(),
          isAdmin: z.boolean().optional(),
          isManager: z.boolean().optional(),
          groups: z
            .array(
              z.object({
                groupId: z.number().optional(),
                name: z.string().optional(),
                code: z.string().optional()
              })
            )
            .optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let result = await client.getUsers(ctx.input.filter, ctx.input.page, ctx.input.limit);

    let users = result.users.map(u => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      online: u.online,
      isAdmin: u.isAdmin,
      isManager: u.isManager,
      groups: u.groups?.map(g => ({
        groupId: g.id,
        name: g.name,
        code: g.code
      }))
    }));

    return {
      output: {
        users,
        totalCount: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPageCount
      },
      message: `Found **${result.pagination.totalCount}** users.`
    };
  })
  .build();
