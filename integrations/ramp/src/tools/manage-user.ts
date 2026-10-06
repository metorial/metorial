import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import {
  invalid,
  nonemptyPatch,
  recordSchema,
  required,
  taskReceipt,
  unsupported
} from '../lib/validation';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Invite a new user, update an existing user's details, deactivate, or reactivate a Ramp user.
- **invite**: Sends an invitation email to join the Ramp business. Requires email, name, and role.
- **update**: Modifies user fields such as department, location, manager, or role.
- **deactivate** / **reactivate**: Changes the user's active status.`,
  instructions: [
    'For invite action, role must be one of: BUSINESS_ADMIN, BUSINESS_USER, BUSINESS_BOOKKEEPER',
    'Invitations are asynchronous. Use get_task_status and a user readback before claiming completion.',
    'Keep the task ID and caller-supplied idempotencyKey. Ramp may reject a duplicate key; an ambiguous request requires task or exact-email readback before another create attempt. Generated keys change between invocations.',
    'Updating email is not supported by the current API. Name and manager fields are supported.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['invite', 'update', 'deactivate', 'reactivate'])
        .describe('Action to perform on the user'),
      userId: z
        .string()
        .optional()
        .describe('Required for update, deactivate, reactivate actions'),
      email: z.string().optional().describe('Email address (required for invite)'),
      firstName: z.string().optional().describe('First name (required for invite)'),
      lastName: z.string().optional().describe('Last name (required for invite)'),
      role: z
        .enum(['BUSINESS_ADMIN', 'BUSINESS_USER', 'BUSINESS_BOOKKEEPER'])
        .optional()
        .describe('User role'),
      departmentId: z.string().optional().describe('Department ID to assign'),
      locationId: z.string().optional().describe('Location ID to assign'),
      directManagerId: z.string().optional().describe('Direct manager user ID'),
      isManager: z.boolean().optional().describe('Whether the user is a manager'),
      isDraft: z
        .boolean()
        .optional()
        .describe(
          "For invite: create a draft user without sending an invitation. Defaults to the provider's normal invitation behavior when omitted."
        ),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique idempotency key for invite action')
    })
  )
  .output(
    z.object({
      result: recordSchema.describe(
        'API resource, deferred receipt, or empty-success acknowledgment'
      ),
      taskId: z
        .string()
        .optional()
        .describe('Deferred user-invitation task identifier, when submitted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);
    if (ctx.input.action === 'invite') {
      required(ctx.input.email, 'email');
      required(ctx.input.firstName, 'firstName');
      required(ctx.input.lastName, 'lastName');
      required(ctx.input.role, 'role');
      if (!z.email().safeParse(ctx.input.email).success)
        throw invalid('email must be a valid email address.');
      if ((ctx.input.firstName?.length ?? 0) > 255 || (ctx.input.lastName?.length ?? 0) > 255)
        throw invalid('User names must not exceed 255 characters.');
      let result = await client.createUserInvite({
        email: required(ctx.input.email, 'email'),
        firstName: required(ctx.input.firstName, 'firstName'),
        lastName: required(ctx.input.lastName, 'lastName'),
        role: required(ctx.input.role, 'role'),
        departmentId: ctx.input.departmentId,
        locationId: ctx.input.locationId,
        directManagerId: ctx.input.directManagerId,
        isManager: ctx.input.isManager,
        isDraft: ctx.input.isDraft,
        idempotencyKey:
          ctx.input.idempotencyKey === undefined
            ? crypto.randomUUID()
            : required(ctx.input.idempotencyKey, 'idempotencyKey')
      });
      let taskId = taskReceipt(result);
      return {
        output: { result, taskId },
        message: ctx.input.isDraft
          ? 'Submitted a draft-user creation task without requesting an invitation email.'
          : 'Submitted the user invitation task. Check its status and read back the user.'
      };
    }
    required(ctx.input.userId, 'userId');
    if (ctx.input.action === 'update') {
      unsupported(ctx.input, ['email', 'isDraft', 'idempotencyKey'], 'User update');
      let fields = {
        departmentId: ctx.input.departmentId,
        locationId: ctx.input.locationId,
        directManagerId: ctx.input.directManagerId,
        role: ctx.input.role,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        isManager: ctx.input.isManager
      };
      nonemptyPatch(fields);
      for (let [key, value] of Object.entries(fields))
        if (typeof value === 'string') required(value, key);
      let result = await client.updateUser(required(ctx.input.userId, 'userId'), fields);
      return {
        output: { result },
        message: 'Ramp acknowledged the user update. Read the user to confirm its state.'
      };
    }
    unsupported(
      ctx.input,
      [
        'email',
        'firstName',
        'lastName',
        'role',
        'departmentId',
        'locationId',
        'directManagerId',
        'isManager',
        'isDraft',
        'idempotencyKey'
      ],
      'User status change'
    );
    let result =
      ctx.input.action === 'deactivate'
        ? await client.deactivateUser(required(ctx.input.userId, 'userId'))
        : await client.reactivateUser(required(ctx.input.userId, 'userId'));
    return {
      output: { result },
      message: 'Ramp acknowledged the user status change. Read the user to confirm its state.'
    };
  })
  .build();
