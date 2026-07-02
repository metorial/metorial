import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let listAdmins = SlateTool.create(spec, {
  name: 'List Admins',
  key: 'list_admins',
  description: `Retrieve a list of Duo Security administrator accounts with their roles and contact information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of admins to return (default 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      admins: z.array(
        z.object({
          adminId: z.string(),
          name: z.string(),
          email: z.string(),
          phone: z.string().optional(),
          role: z.string().optional(),
          status: z.string().optional(),
          lastLogin: z.number().nullable().optional(),
          created: z.number().optional()
        })
      ),
      totalObjects: z.number().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.listAdmins({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let admins = (result.response || []).map((a: any) => ({
      adminId: a.admin_id,
      name: a.name,
      email: a.email,
      phone: a.phone || undefined,
      role: a.role || undefined,
      status: a.status || undefined,
      lastLogin: a.last_login ?? null,
      created: a.created
    }));

    let totalObjects = result.metadata?.total_objects;
    let hasMore =
      totalObjects !== undefined
        ? (ctx.input.offset ?? 0) + admins.length < totalObjects
        : false;

    return {
      output: { admins, totalObjects, hasMore },
      message: `Found **${admins.length}** admin(s).`
    };
  })
  .build();

export let createAdmin = SlateTool.create(spec, {
  name: 'Create Admin',
  key: 'create_admin',
  description: `Create a new Duo Security administrator account with a specified role.`
})
  .input(
    z.object({
      name: z.string().describe('Full name of the administrator'),
      email: z.string().describe('Email address for the administrator'),
      phone: z.string().describe('Phone number for the administrator'),
      role: z
        .enum([
          'Owner',
          'Administrator',
          'User Manager',
          'Security Analyst',
          'Application Manager',
          'Read-only',
          'Billing'
        ])
        .optional()
        .describe('Administrator role (default: Owner)')
    })
  )
  .output(
    z.object({
      adminId: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.createAdmin({
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone,
      role: ctx.input.role
    });

    let a = result.response;
    return {
      output: {
        adminId: a.admin_id,
        name: a.name,
        email: a.email,
        role: a.role || undefined
      },
      message: `Created admin **${a.name}** (${a.email}) with role ${a.role || 'Owner'}.`
    };
  })
  .build();

export let updateAdmin = SlateTool.create(spec, {
  name: 'Update Admin',
  key: 'update_admin',
  description: `Update an existing Duo Security administrator's name, phone, or role.`
})
  .input(
    z.object({
      adminId: z.string().describe('The Duo admin ID to update'),
      name: z.string().optional().describe('New name for the admin'),
      phone: z.string().optional().describe('New phone number'),
      role: z
        .enum([
          'Owner',
          'Administrator',
          'User Manager',
          'Security Analyst',
          'Application Manager',
          'Read-only',
          'Billing'
        ])
        .optional()
        .describe('New role')
    })
  )
  .output(
    z.object({
      adminId: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.updateAdmin(ctx.input.adminId, {
      name: ctx.input.name,
      phone: ctx.input.phone,
      role: ctx.input.role
    });

    let a = result.response;
    return {
      output: {
        adminId: a.admin_id,
        name: a.name,
        email: a.email,
        role: a.role || undefined
      },
      message: `Updated admin **${a.name}**.`
    };
  })
  .build();

export let deleteAdmin = SlateTool.create(spec, {
  name: 'Delete Admin',
  key: 'delete_admin',
  description: `Delete a Duo Security administrator account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      adminId: z.string().describe('The Duo admin ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    await client.deleteAdmin(ctx.input.adminId);
    return {
      output: { deleted: true },
      message: `Deleted admin \`${ctx.input.adminId}\`.`
    };
  })
  .build();
