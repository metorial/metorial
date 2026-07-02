import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user (manager) who can access the GatherUp dashboard. Assign a role and optionally specify which businesses the user can manage.`,
  instructions: ['Role IDs: 3=Manager, 4=Team, 5=Contributor, 6=Read Only.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('User email address'),
      firstName: z.string().describe('User first name'),
      lastName: z.string().describe('User last name'),
      roleId: z
        .number()
        .optional()
        .describe('Role: 3=Manager, 4=Team, 5=Contributor, 6=Read Only'),
      sendPasswordEmail: z.boolean().optional().describe('Send password via email'),
      managedBusinessIds: z
        .array(z.number())
        .optional()
        .describe('List of business IDs the user can manage')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('ID of the created user'),
      password: z
        .string()
        .optional()
        .describe('Generated password (only if user was successfully created)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.createUser({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      roleId: ctx.input.roleId,
      sendPasswordEmail: ctx.input.sendPasswordEmail ? 1 : 0,
      managedBusinessIds: ctx.input.managedBusinessIds
    });

    if (data.errorCode !== 0) {
      throw new Error(`Failed to create user: ${data.errorMessage} (code: ${data.errorCode})`);
    }

    return {
      output: {
        userId: data.userId,
        password: data.password
      },
      message: `Created user **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}) with ID **${data.userId}**.`
    };
  })
  .build();
