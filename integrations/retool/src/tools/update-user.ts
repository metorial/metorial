import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a Retool user's properties such as name, email, active status, or metadata. Only provide the fields you want to change.`,
  instructions: [
    'Provide only the fields you want to update. Omitted fields remain unchanged.'
  ]
})
  .input(
    z.object({
      userId: z.string().describe('The ID of the user to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email address'),
      active: z
        .boolean()
        .optional()
        .describe('Set to true to activate or false to deactivate the user'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated metadata key-value pairs')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      active: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let operations: Array<{ op: string; path: string; value: any }> = [];
    if (ctx.input.firstName !== undefined)
      operations.push({ op: 'replace', path: '/first_name', value: ctx.input.firstName });
    if (ctx.input.lastName !== undefined)
      operations.push({ op: 'replace', path: '/last_name', value: ctx.input.lastName });
    if (ctx.input.email !== undefined)
      operations.push({ op: 'replace', path: '/email', value: ctx.input.email });
    if (ctx.input.active !== undefined)
      operations.push({ op: 'replace', path: '/active', value: ctx.input.active });
    if (ctx.input.metadata !== undefined)
      operations.push({ op: 'replace', path: '/metadata', value: ctx.input.metadata });

    if (operations.length === 0) {
      let current = await client.getUser(ctx.input.userId);
      let u = current.data;
      return {
        output: {
          userId: u.id,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          active: u.active
        },
        message: `No changes specified. User **${u.first_name} ${u.last_name}** remains unchanged.`
      };
    }

    let result = await client.updateUser(ctx.input.userId, operations);
    let u = result.data;

    return {
      output: {
        userId: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        active: u.active
      },
      message: `Updated user **${u.first_name} ${u.last_name}** (${u.email}). Changed fields: ${operations.map(o => o.path.replace('/', '')).join(', ')}.`
    };
  })
  .build();
