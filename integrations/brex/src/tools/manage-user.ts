import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Invite a new user or update an existing user in Brex.
Use this to onboard employees, update their profile (name, department, location, manager), or set their monthly spend limit.
To invite a new user, provide **firstName**, **lastName**, and **email** without a **userId**.
To update an existing user, provide a **userId** along with the fields to update.`,
  instructions: [
    'To invite a new user, omit userId and provide firstName, lastName, and email.',
    'To update an existing user, provide userId along with only the fields you want to change.',
    "Set monthlySpendLimit to null to remove a user's spending limit."
  ]
})
  .input(
    z.object({
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
        .describe('Monthly spend limit for the user. Set to null to remove the limit.')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Email address'),
      status: z.string().describe('Current user status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user: any;
    let action: string;

    if (ctx.input.userId) {
      // Update existing user
      let updateData: Record<string, any> = {};
      if (ctx.input.firstName !== undefined) updateData.first_name = ctx.input.firstName;
      if (ctx.input.lastName !== undefined) updateData.last_name = ctx.input.lastName;
      if (ctx.input.managerId !== undefined) updateData.manager_id = ctx.input.managerId;
      if (ctx.input.departmentId !== undefined)
        updateData.department_id = ctx.input.departmentId;
      if (ctx.input.locationId !== undefined) updateData.location_id = ctx.input.locationId;

      user = await client.updateUser(ctx.input.userId, updateData);
      action = 'updated';

      // Handle spend limit separately if provided
      if (ctx.input.monthlySpendLimit !== undefined) {
        let limitData = ctx.input.monthlySpendLimit
          ? {
              monthly_limit: {
                amount: ctx.input.monthlySpendLimit.amount,
                currency: ctx.input.monthlySpendLimit.currency ?? 'USD'
              }
            }
          : { monthly_limit: null };
        await client.setUserLimit(ctx.input.userId, limitData);
      }
    } else {
      // Invite new user
      user = await client.inviteUser({
        first_name: ctx.input.firstName!,
        last_name: ctx.input.lastName!,
        email: ctx.input.email!,
        manager_id: ctx.input.managerId,
        department_id: ctx.input.departmentId,
        location_id: ctx.input.locationId
      });
      action = 'invited';

      if (ctx.input.monthlySpendLimit) {
        await client.setUserLimit(user.id, {
          monthly_limit: {
            amount: ctx.input.monthlySpendLimit.amount,
            currency: ctx.input.monthlySpendLimit.currency ?? 'USD'
          }
        });
      }
    }

    return {
      output: {
        userId: user.id,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        email: user.email ?? null,
        status: user.status
      },
      message: `Successfully ${action} user **${user.first_name} ${user.last_name}** (${user.email}).`
    };
  })
  .build();
