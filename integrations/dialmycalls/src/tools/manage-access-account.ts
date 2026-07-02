import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAccessAccount = SlateTool.create(spec, {
  name: 'Manage Access Account',
  key: 'manage_access_account',
  description: `Create, update, or delete sub-accounts (access accounts) that can schedule broadcasts on behalf of the main account. Each access account has its own email, password, and name.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform.'),
      accessAccountId: z
        .string()
        .optional()
        .describe('Required for update and delete actions.'),
      name: z.string().optional().describe('Account name. Required for create.'),
      email: z.string().optional().describe('Account email. Required for create.'),
      password: z
        .string()
        .optional()
        .describe('Account password (8+ chars, 1 digit, 1 uppercase). Required for create.')
    })
  )
  .output(
    z.object({
      accessAccountId: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, accessAccountId, name, email, password } = ctx.input;

    if (action === 'delete') {
      if (!accessAccountId) throw new Error('accessAccountId is required for delete action');
      await client.deleteAccessAccount(accessAccountId);
      return {
        output: { accessAccountId },
        message: `Access account \`${accessAccountId}\` deleted successfully.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for create action');
      if (!email) throw new Error('email is required for create action');
      if (!password) throw new Error('password is required for create action');
      let result = await client.createAccessAccount({ name, email, password });
      return {
        output: {
          accessAccountId: result.id,
          name: result.name,
          email: result.email,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Access account **${result.name}** created with ID \`${result.id}\`.`
      };
    }

    // update
    if (!accessAccountId) throw new Error('accessAccountId is required for update action');
    let result = await client.updateAccessAccount(accessAccountId, { name, email, password });
    return {
      output: {
        accessAccountId: result.id,
        name: result.name,
        email: result.email,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Access account \`${accessAccountId}\` updated successfully.`
    };
  })
  .build();
