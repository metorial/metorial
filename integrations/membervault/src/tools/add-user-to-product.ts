import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addUserToProduct = SlateTool.create(spec, {
  name: 'Add User to Product',
  key: 'add_user_to_product',
  description: `Add a user to a specific product in MemberVault. If the user doesn't have an account yet, one will be created automatically. If the user already exists, they are simply granted access to the specified product — no duplicates are created.
Set **productId** to \`-1\` to create the user account without granting access to any product.`,
  instructions: ['Use the "List Products" tool first to find the correct product ID.']
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to add'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      productId: z
        .string()
        .describe(
          'ID of the product to grant access to. Use "-1" to add the user without granting product access.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    await client.addUserToProduct({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      productId: ctx.input.productId
    });

    let productLabel =
      ctx.input.productId === '-1'
        ? 'without product access'
        : `to product **${ctx.input.productId}**`;

    return {
      output: { success: true },
      message: `Added user **${ctx.input.email}** ${productLabel}.`
    };
  })
  .build();
