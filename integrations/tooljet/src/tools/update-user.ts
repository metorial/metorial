import { pickDefined, SlateTool } from 'slates';
import { Client } from '../lib/client';
import { mappedUser, userSchema } from '../lib/schemas';
import { fail, text, z } from '../lib/validation';
import { spec } from '../spec';
export const updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description:
    'Partially update user fields by exact UUID or email from list_users. Archive preserves the account/history. Password changes are accepted by the server but cannot be verified through readable fields.',
  tags: { destructive: true }
})
  .input(
    z.object({
      identifier: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      password: z.string().optional(),
      status: z.enum(['active', 'archived']).optional()
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      user: userSchema.optional(),
      verification: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const body = pickDefined({
      name: ctx.input.name,
      email: ctx.input.email,
      password: ctx.input.password,
      status: ctx.input.status
    });
    if (!Object.keys(body).length) fail('Provide at least one changed user field.');
    for (const [k, v] of Object.entries(body)) text(v, k);
    const client = new Client(ctx.auth, ctx.config),
      before = await client.getUser(ctx.input.identifier);
    await client.updateUser(before.id, body);
    let after: Awaited<ReturnType<Client['getUser']>>;
    try {
      after = await client.getUser(before.id);
    } catch {
      fail(
        'ToolJet accepted the update but exact readback failed. Reconcile this user before retrying.',
        'update_unverified',
        { userId: before.id }
      );
    }
    for (const k of ['name', 'email', 'status'] as const)
      if (ctx.input[k] !== undefined && after[k] !== ctx.input[k])
        fail(
          'ToolJet accepted the update but native readable fields differ. Reconcile this user before retrying.',
          'update_unverified',
          { userId: before.id }
        );
    return {
      output: {
        success: true,
        user: mappedUser(after),
        verification:
          ctx.input.password === undefined
            ? 'readable_fields_confirmed'
            : 'readable_fields_confirmed_password_not_readable'
      },
      message: 'ToolJet accepted the update and returned the current readable user state.'
    };
  })
  .build();
