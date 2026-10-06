import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapUser } from '../lib/schemas';
import { exact, fail, required } from '../lib/validation';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Invite a new user or update an existing user in Brex.
Use this to onboard employees, update department, location and manager assignments, or manage their documented status transitions. Existing firstName/lastName/email update inputs and monthlySpendLimit are retained but rejected because current user updates do not document those fields or limit routes.
To invite a new user, provide **firstName**, **lastName**, and **email** without a **userId**.
To update an existing user, provide a **userId** along with the fields to update.`,
  instructions: [
    'To invite a new user, omit userId and provide firstName, lastName, and email.',
    'To update an existing user, provide userId along with only the fields you want to change.',
    'createInactive creates an INACTIVE user without invitation; omit it to retain invitation behavior. Lifecycle transitions are validated against current status before updating.'
  ]
})
  .input(
    z.object({
      createInactive: z
        .boolean()
        .optional()
        .describe(
          'Create an inactive synthetic or pre-onboarding user without sending an invitation. Only for creation.'
        ),
      status: z
        .enum(['ACTIVE', 'DISABLED', 'ARCHIVED', 'INACTIVE', 'DELETED'])
        .optional()
        .describe(
          'Existing user status transition. DELETED withdraws an invitation or deletes an inactive user.'
        ),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Optional caller-supplied key for create/update retries. Reuse the same key for the same request; omission does not generate a key and no automatic retry runs.'
        ),
      userId: z
        .string()
        .optional()
        .describe('ID of an existing user to update. Omit to invite a new user.'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      email: z.string().optional().describe('Email address of the user (required for invite)'),
      managerId: z.string().optional().describe("ID of the user's manager"),
      departmentId: z.string().optional().describe('ID of the department to assign'),
      locationId: z.string().optional().describe('ID of the location to assign'),
      monthlySpendLimit: z
        .object({
          amount: z.number().describe('Amount in cents (e.g., 100000 = $1,000.00)'),
          currency: z.string().optional().describe('Currency code (defaults to USD)')
        })
        .nullable()
        .optional()
        .describe(
          'Retained legacy field; current Team API does not document user-limit updates. Rejected before a request.'
        )
        .meta({ deprecated: true })
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Email address'),
      status: z.string().nullish().describe('Current user status')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.userId !== undefined) required(ctx.input.userId, 'userId');
    if (ctx.input.monthlySpendLimit !== undefined)
      fail(
        'monthlySpendLimit is not supported by the current documented Team API. Use manage_budget with resourceType spend_limit for spending controls.'
      );
    const client = new Client({ token: ctx.auth.token });
    if (ctx.input.userId) {
      if (ctx.input.createInactive !== undefined)
        fail('createInactive applies only to new users.');
      if (
        [ctx.input.firstName, ctx.input.lastName, ctx.input.email].some(v => v !== undefined)
      )
        fail(
          'The current user update API does not support firstName, lastName or email. Omit those fields.'
        );
      const data = {
        manager_id: ctx.input.managerId,
        department_id: ctx.input.departmentId,
        location_id: ctx.input.locationId,
        status: ctx.input.status
      };
      if (Object.values(data).every(v => v === undefined))
        fail('Provide a supported profile assignment or status to update.');
      if (ctx.input.status) {
        const current = await client.getUser(ctx.input.userId);
        const allowed: Record<string, string[]> = {
          ACTIVE: ['DISABLED'],
          DISABLED: ['ACTIVE'],
          INACTIVE: ['ARCHIVED', 'DELETED'],
          ARCHIVED: ['INACTIVE'],
          INVITED: ['DELETED']
        };
        if (!current.status || !allowed[current.status]?.includes(ctx.input.status))
          fail(
            'The requested user status transition is not documented for the current status.'
          );
      }
      const user = await client.updateUser(ctx.input.userId, data, ctx.input.idempotencyKey);
      exact(user.id, ctx.input.userId);
      return {
        output: mapUser(user),
        message: 'User updated. Deletion and invitation changes can retain audit history.'
      };
    }
    if (ctx.input.status !== undefined)
      fail(
        'status applies only to existing users; use createInactive for creation without invitation.'
      );
    const email = required(ctx.input.email, 'email');
    if (!z.email().safeParse(email).success) fail('email must be a valid email address.');
    const user = await client.inviteUser(
      {
        first_name: required(ctx.input.firstName, 'firstName'),
        last_name: required(ctx.input.lastName, 'lastName'),
        email,
        manager_id: ctx.input.managerId,
        department_id: ctx.input.departmentId,
        location_id: ctx.input.locationId
      },
      ctx.input.idempotencyKey,
      ctx.input.createInactive
    );
    return {
      output: mapUser(user),
      message: ctx.input.createInactive
        ? 'Inactive user created without an invitation.'
        : 'User invitation created; an invitation may be sent.'
    };
  })
  .build();
