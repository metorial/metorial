import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier for the user'),
  id: z.string().optional().describe('Partner-defined unique identifier'),
  email: z.string().optional().nullable().describe('Email address'),
  isDisabled: z.boolean().optional().describe('Whether the user is disabled'),
  metadata: z.string().optional().nullable().describe('Partner-defined metadata')
});

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new end-user on the MX platform. Users represent consumers in your application. Each user can have up to 25 connected members (financial institution connections). In the development environment, you are limited to 100 users.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      id: z
        .string()
        .optional()
        .describe(
          'Your unique identifier for this user. Recommended for mapping between your system and MX.'
        ),
      metadata: z
        .string()
        .optional()
        .describe('Custom metadata string (do not include sensitive data)')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let user = await client.createUser({
      id: ctx.input.id,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        guid: user.guid,
        id: user.id,
        email: user.email,
        isDisabled: user.is_disabled,
        metadata: user.metadata
      },
      message: `Created user **${user.guid}**${user.id ? ` (id: ${user.id})` : ''}.`
    };
  })
  .build();

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users on the MX platform. Returns paginated results. Each user represents an end consumer in your application.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      recordsPerPage: z
        .number()
        .optional()
        .describe('Number of records per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let result = await client.listUsers({
      page: ctx.input.page,
      recordsPerPage: ctx.input.recordsPerPage
    });

    let users = (result.users || []).map((u: any) => ({
      guid: u.guid,
      id: u.id,
      email: u.email,
      isDisabled: u.is_disabled,
      metadata: u.metadata
    }));

    return {
      output: {
        users,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${users.length}** users.`
    };
  })
  .build();

export let readUser = SlateTool.create(spec, {
  name: 'Read User',
  key: 'read_user',
  description: `Retrieve details of a specific user by their MX GUID. Returns the user's profile information including ID, email, metadata, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z
        .string()
        .describe('MX GUID of the user (e.g., USR-12345678-abcd-1234-abcd-123456789012)')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let user = await client.readUser(ctx.input.userGuid);

    return {
      output: {
        guid: user.guid,
        id: user.id,
        email: user.email,
        isDisabled: user.is_disabled,
        metadata: user.metadata
      },
      message: `User **${user.guid}**${user.id ? ` (id: ${user.id})` : ''}.`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's attributes. You can modify the user's custom ID, metadata, or disabled status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user to update'),
      id: z.string().optional().describe('New custom identifier for the user'),
      metadata: z.string().optional().describe('New metadata string'),
      isDisabled: z.boolean().optional().describe('Set to true to disable the user')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let user = await client.updateUser(ctx.input.userGuid, {
      id: ctx.input.id,
      metadata: ctx.input.metadata,
      isDisabled: ctx.input.isDisabled
    });

    return {
      output: {
        guid: user.guid,
        id: user.id,
        email: user.email,
        isDisabled: user.is_disabled,
        metadata: user.metadata
      },
      message: `Updated user **${user.guid}**.`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user and all associated data (members, accounts, transactions, holdings). This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    await client.deleteUser(ctx.input.userGuid);

    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userGuid}** and all associated data.`
    };
  })
  .build();
