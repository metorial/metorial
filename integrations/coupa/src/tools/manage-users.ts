import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.number().describe('Coupa internal user ID'),
  login: z.string().nullable().optional().describe('User login name'),
  email: z.string().nullable().optional().describe('User email'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  fullName: z.string().nullable().optional().describe('Full name'),
  employeeNumber: z.string().nullable().optional().describe('Employee number'),
  active: z.boolean().nullable().optional().describe('Whether user is active'),
  department: z.any().nullable().optional().describe('Department'),
  roles: z.array(z.any()).nullable().optional().describe('User roles'),
  defaultAddress: z.any().nullable().optional().describe('Default address'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw user data')
});

export let searchUsers = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description: `Search and list users in Coupa. Filter by name, email, login, active status, department, and other attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      login: z.string().optional().describe('Filter by login name'),
      email: z.string().optional().describe('Filter by email'),
      active: z.boolean().optional().describe('Filter by active status'),
      employeeNumber: z.string().optional().describe('Filter by employee number'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter users updated after this date (ISO 8601)'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Coupa query filters'),
      orderBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema).describe('List of matching users'),
      count: z.number().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let filters: Record<string, string> = {};
    if (ctx.input.filters) {
      for (let [key, value] of Object.entries(ctx.input.filters)) {
        filters[key] = value;
      }
    }
    if (ctx.input.login) filters.login = ctx.input.login;
    if (ctx.input.email) filters.email = ctx.input.email;
    if (ctx.input.active !== undefined) filters.active = String(ctx.input.active);
    if (ctx.input.employeeNumber) filters['employee-number'] = ctx.input.employeeNumber;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listUsers({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = (Array.isArray(results) ? results : []).map((u: any) => ({
      userId: u.id,
      login: u.login ?? null,
      email: u.email ?? null,
      firstName: u.firstname ?? u.firstname ?? null,
      lastName: u.lastname ?? u.lastname ?? null,
      fullName: u.fullname ?? u.fullname ?? null,
      employeeNumber: u['employee-number'] ?? u.employee_number ?? null,
      active: u.active ?? null,
      department: u.department ?? null,
      roles: u.roles ?? null,
      defaultAddress: u['default-address'] ?? u.default_address ?? null,
      createdAt: u['created-at'] ?? u.created_at ?? null,
      updatedAt: u['updated-at'] ?? u.updated_at ?? null,
      rawData: u
    }));

    return {
      output: {
        users,
        count: users.length
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in Coupa with login credentials, email, name, and role assignments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      login: z.string().describe('User login name'),
      email: z.string().describe('User email address'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      employeeNumber: z.string().optional().describe('Employee number'),
      active: z.boolean().optional().describe('Whether user should be active (default true)'),
      department: z.object({ name: z.string() }).optional().describe('Department'),
      roles: z
        .array(z.object({ name: z.string() }))
        .optional()
        .describe('User roles to assign'),
      defaultAddress: z
        .object({
          addressId: z.number()
        })
        .optional()
        .describe('Default address reference'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {
      login: ctx.input.login,
      email: ctx.input.email,
      firstname: ctx.input.firstName,
      lastname: ctx.input.lastName
    };

    if (ctx.input.employeeNumber) payload['employee-number'] = ctx.input.employeeNumber;
    if (ctx.input.active !== undefined) payload.active = ctx.input.active;
    if (ctx.input.department) payload.department = ctx.input.department;
    if (ctx.input.roles) payload.roles = ctx.input.roles;
    if (ctx.input.defaultAddress)
      payload['default-address'] = { id: ctx.input.defaultAddress.addressId };

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createUser(payload);

    return {
      output: {
        userId: result.id,
        login: result.login ?? null,
        email: result.email ?? null,
        firstName: result.firstname ?? result.firstname ?? null,
        lastName: result.lastname ?? result.lastname ?? null,
        fullName: result.fullname ?? result.fullname ?? null,
        employeeNumber: result['employee-number'] ?? result.employee_number ?? null,
        active: result.active ?? null,
        department: result.department ?? null,
        roles: result.roles ?? null,
        defaultAddress: result['default-address'] ?? result.default_address ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Created user **${result.login ?? result.id}** (${result.email}).`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user in Coupa. Modify profile information, active status, department, or role assignments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('Coupa user ID to update'),
      email: z.string().optional().describe('Updated email'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      employeeNumber: z.string().optional().describe('Updated employee number'),
      active: z.boolean().optional().describe('Updated active status'),
      department: z.object({ name: z.string() }).optional().describe('Updated department'),
      roles: z
        .array(z.object({ name: z.string() }))
        .optional()
        .describe('Updated role assignments'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to update')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {};

    if (ctx.input.email) payload.email = ctx.input.email;
    if (ctx.input.firstName) payload.firstname = ctx.input.firstName;
    if (ctx.input.lastName) payload.lastname = ctx.input.lastName;
    if (ctx.input.employeeNumber) payload['employee-number'] = ctx.input.employeeNumber;
    if (ctx.input.active !== undefined) payload.active = ctx.input.active;
    if (ctx.input.department) payload.department = ctx.input.department;
    if (ctx.input.roles) payload.roles = ctx.input.roles;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.updateUser(ctx.input.userId, payload);

    return {
      output: {
        userId: result.id,
        login: result.login ?? null,
        email: result.email ?? null,
        firstName: result.firstname ?? result.firstname ?? null,
        lastName: result.lastname ?? result.lastname ?? null,
        fullName: result.fullname ?? result.fullname ?? null,
        employeeNumber: result['employee-number'] ?? result.employee_number ?? null,
        active: result.active ?? null,
        department: result.department ?? null,
        roles: result.roles ?? null,
        defaultAddress: result['default-address'] ?? result.default_address ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Updated user **${result.login ?? result.id}**.`
    };
  })
  .build();
