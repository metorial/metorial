import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { email, fail, id, integer, pickDefined, text } from '../lib/contracts';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a user in Aircall. When creating, provide email, first name, and last name. When updating, specify only the fields to change. Supports setting availability, roles, and wrap-up time through the documented V1 API, which has announced deprecation. Creation sends an invitation email. Deletion is queued and can destroy associated data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      userId: z.number().optional().describe('User ID (required for update and delete)'),
      email: z.string().optional().describe('Email address (required for create)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name (required for create)'),
      availabilityStatus: z
        .enum(['available', 'custom', 'unavailable'])
        .optional()
        .describe('Availability status'),
      substatus: z
        .enum(['out_for_lunch', 'on_a_break', 'in_training', 'doing_back_office', 'other'])
        .optional()
        .describe('Substatus when availabilityStatus is unavailable'),
      roleIds: z
        .array(z.string())
        .optional()
        .describe('Role IDs: owner, supervisor, admin, agent'),
      wrapUpTime: z.number().optional().describe('Wrap-up time in seconds after each call')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('User ID'),
      name: z.string().optional().describe('Full name of the user'),
      email: z.string().optional().describe('Email address'),
      accepted: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      unverifiedFields: z
        .array(z.string())
        .optional()
        .describe(
          'Requested fields omitted from the native V1 readback; do not retry blindly'
        ),
      pending: z.boolean().optional(),
      invitationSent: z.boolean().optional(),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth),
      action = ctx.input.action;
    const data = pickDefined({
      first_name:
        ctx.input.firstName === undefined
          ? undefined
          : text(ctx.input.firstName, 'firstName', 255),
      last_name:
        ctx.input.lastName === undefined
          ? undefined
          : text(ctx.input.lastName, 'lastName', 255),
      availability_status: ctx.input.availabilityStatus,
      substatus: ctx.input.substatus,
      role_ids: ctx.input.roleIds,
      wrap_up_time:
        ctx.input.wrapUpTime === undefined
          ? undefined
          : integer(ctx.input.wrapUpTime, 'wrapUpTime')
    });
    if (
      ctx.input.roleIds !== undefined &&
      (!ctx.input.roleIds.length ||
        ctx.input.roleIds.some(v => !['owner', 'supervisor', 'admin', 'agent'].includes(v)))
    )
      fail('roleIds must contain documented V1 roles: owner, supervisor, admin or agent.');
    if (ctx.input.substatus !== undefined && ctx.input.availabilityStatus !== 'unavailable')
      fail('substatus requires availabilityStatus unavailable.');
    if (action === 'delete') {
      if (Object.keys(data).length || ctx.input.email !== undefined)
        fail(
          'Delete accepts userId only; remove update fields before requesting destructive deletion.'
        );
      const userId = id(ctx.input.userId, 'userId');
      const state = await client.deleteUser(userId);
      return {
        output: { userId, ...state },
        message:
          'Aircall acknowledged queued user deletion. Associated data may be destroyed; deletion can take minutes and is not confirmed. Reconcile before retrying.'
      };
    }
    if (action === 'create') {
      if (ctx.input.substatus !== undefined)
        fail(
          'substatus is not documented for V1 user creation; update the user afterward with unavailable status.'
        );
      const user = await client.createUser({
        ...data,
        email: email(ctx.input.email),
        first_name: text(ctx.input.firstName, 'firstName', 255),
        last_name: text(ctx.input.lastName, 'lastName', 255)
      });
      return {
        output: {
          userId: id(user.id),
          name: text(user.name, 'Native user name'),
          email: email(user.email),
          accepted: true,
          invitationSent: true
        },
        message:
          'Created the native V1 user. Aircall sends an invitation email; account confirmation remains with the recipient. V1 has announced deprecation.'
      };
    }
    if (ctx.input.email !== undefined) fail('email is supported only for V1 user creation.');
    if (!Object.keys(data).length) fail('Supply at least one supported field to update.');
    const userId = id(ctx.input.userId, 'userId');
    await client.updateUser(userId, data);
    const user = await client.getUser(userId);
    const unverifiedFields: string[] = [];
    const publicFields: Record<string, string> = {
      first_name: 'firstName',
      last_name: 'lastName',
      availability_status: 'availabilityStatus',
      substatus: 'substatus',
      role_ids: 'roleIds',
      wrap_up_time: 'wrapUpTime'
    };
    for (const [k, v] of Object.entries(data)) {
      if (user[k] === undefined) {
        // V1 documents the resulting full name, rather than separate name parts.
        if (
          (k === 'first_name' || k === 'last_name') &&
          data.first_name !== undefined &&
          data.last_name !== undefined &&
          user.name === `${data.first_name} ${data.last_name}`
        )
          continue;
        unverifiedFields.push(publicFields[k] ?? k);
      } else if (JSON.stringify(user[k]) !== JSON.stringify(v))
        fail(
          'The user update was acknowledged but a returned native field differs. Reconcile before retrying.',
          'aircall_pending'
        );
    }
    return {
      output: {
        userId,
        name: text(user.name, 'Native user name'),
        email: email(user.email),
        accepted: true,
        confirmed: unverifiedFields.length === 0,
        unverifiedFields
      },
      message: unverifiedFields.length
        ? 'Aircall accepted the user update. The native V1 readback omits some requested fields, so verification is incomplete; reconcile before retrying.'
        : 'Verified the requested native V1 user fields; invitation/history effects are not erased.'
    };
  })
  .build();
