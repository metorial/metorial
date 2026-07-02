import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().optional().describe('SuperSaaS internal user ID'),
  foreignKey: z.string().optional().describe('Foreign key from your own database'),
  name: z.string().optional().describe('Username (max 50 characters)'),
  fullName: z.string().optional().describe('Full display name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile number'),
  address: z.string().optional().describe('Address'),
  country: z.string().optional().describe('Country (ISO 3166-1 code)'),
  timezone: z.string().optional().describe('Timezone (IANA identifier)'),
  field1: z.string().optional().describe('Custom field 1'),
  field2: z.string().optional().describe('Custom field 2'),
  superField: z.string().optional().describe('Super custom field'),
  credit: z.number().optional().describe('Credit balance'),
  role: z.number().optional().describe('User role: 3=regular, 4=superuser, -1=blocked'),
  createdOn: z.string().optional().describe('UTC creation timestamp')
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a list of users from the SuperSaaS account. Supports pagination and optionally includes attached form data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results (default 100, max 1000)'),
      offset: z.number().optional().describe('Pagination offset'),
      includeFormData: z.boolean().optional().describe('Whether to include attached form data')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.listUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      form: ctx.input.includeFormData
    });

    let users = Array.isArray(data) ? data.map(mapUserResponse) : [];

    return {
      output: { users },
      message: `Retrieved **${users.length}** user(s).`
    };
  })
  .build();

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a single user by their SuperSaaS ID, username, or foreign key. Use a foreign key by appending "fk" to the ID (e.g., "1234fk").`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe(
          'User ID, username, or foreign key (append "fk" for foreign keys, e.g. "1234fk")'
        )
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.getUser(ctx.input.userId);
    let user = mapUserResponse(data);

    return {
      output: user,
      message: `Retrieved user **${user.name || user.userId || ctx.input.userId}**.`
    };
  })
  .build();

export let createUserTool = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in the SuperSaaS account. Optionally link to a user in your own database via a foreign key.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Username (max 50 characters, required)'),
      fullName: z.string().optional().describe('Full display name'),
      email: z.string().optional().describe('Email address'),
      password: z.string().optional().describe('Password'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      address: z.string().optional().describe('Address'),
      country: z.string().optional().describe('Country (ISO 3166-1 code)'),
      timezone: z.string().optional().describe('Timezone (IANA identifier)'),
      field1: z.string().optional().describe('Custom field 1'),
      field2: z.string().optional().describe('Custom field 2'),
      superField: z.string().optional().describe('Super custom field'),
      credit: z.number().optional().describe('Credit balance'),
      role: z.number().optional().describe('User role: 3=regular, 4=superuser, -1=blocked'),
      foreignKey: z
        .string()
        .optional()
        .describe('Foreign key from your own database to link this user')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { foreignKey, ...fields } = ctx.input;

    let userData = buildUserParams(fields);
    let data = await client.createUser(userData, foreignKey);
    let user = mapUserResponse(data);

    return {
      output: user,
      message: `Created user **${ctx.input.name}**.`
    };
  })
  .build();

export let updateUserTool = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's information. Identify the user by SuperSaaS ID, username, or foreign key (append "fk" for foreign keys).`
})
  .input(
    z.object({
      userId: z
        .string()
        .describe(
          'User ID, username, or foreign key (append "fk" for foreign keys, e.g. "1234fk")'
        ),
      name: z.string().optional().describe('New username'),
      fullName: z.string().optional().describe('Full display name'),
      email: z.string().optional().describe('Email address'),
      password: z.string().optional().describe('New password'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      address: z.string().optional().describe('Address'),
      country: z.string().optional().describe('Country (ISO 3166-1 code)'),
      timezone: z.string().optional().describe('Timezone (IANA identifier)'),
      field1: z.string().optional().describe('Custom field 1'),
      field2: z.string().optional().describe('Custom field 2'),
      superField: z.string().optional().describe('Super custom field'),
      credit: z.number().optional().describe('Credit balance'),
      role: z.number().optional().describe('User role: 3=regular, 4=superuser, -1=blocked')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { userId, ...fields } = ctx.input;

    let userData = buildUserParams(fields);
    let data = await client.updateUser(userId, userData);
    let user = mapUserResponse(data);

    return {
      output: user,
      message: `Updated user **${userId}**.`
    };
  })
  .build();

export let deleteUserTool = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user from the SuperSaaS account. Identify the user by SuperSaaS ID, username, or foreign key.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe(
          'User ID, username, or foreign key (append "fk" for foreign keys, e.g. "1234fk")'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the user was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteUser(ctx.input.userId);

    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();

// Maps API field names to our schema field names
let buildUserParams = (fields: Record<string, any>): Record<string, any> => {
  let params: Record<string, any> = {};
  let fieldMap: Record<string, string> = {
    name: 'name',
    fullName: 'full_name',
    email: 'email',
    password: 'password',
    phone: 'phone',
    mobile: 'mobile',
    address: 'address',
    country: 'country',
    timezone: 'timezone',
    field1: 'field_1',
    field2: 'field_2',
    superField: 'super_field',
    credit: 'credit',
    role: 'role'
  };

  for (let [key, apiKey] of Object.entries(fieldMap)) {
    if (fields[key] !== undefined && fields[key] !== null) {
      params[apiKey!] = fields[key];
    }
  }

  return params;
};

let mapUserResponse = (data: any): any => {
  if (!data) return {};
  return {
    userId: data.id != null ? String(data.id) : undefined,
    foreignKey: data.fk != null ? String(data.fk) : undefined,
    name: data.name ?? undefined,
    fullName: data.full_name ?? undefined,
    email: data.email ?? undefined,
    phone: data.phone ?? undefined,
    mobile: data.mobile ?? undefined,
    address: data.address ?? undefined,
    country: data.country ?? undefined,
    timezone: data.timezone ?? undefined,
    field1: data.field_1 ?? undefined,
    field2: data.field_2 ?? undefined,
    superField: data.super_field ?? undefined,
    credit: data.credit != null ? Number(data.credit) : undefined,
    role: data.role != null ? Number(data.role) : undefined,
    createdOn: data.created_on ?? undefined
  };
};
