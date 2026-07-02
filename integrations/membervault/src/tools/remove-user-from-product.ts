import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeUserFromProduct = SlateTool.create(spec, {
  name: 'Remove User from Product',
  key: 'remove_user_from_product',
  description: `Revoke a user's access to a specific product in MemberVault. The user's account remains intact — only their access to the specified product is removed.`,
  instructions: ['Use the "List Products" tool first to find the correct product ID.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to remove from the product'),
      productId: z.string().describe('ID of the product to revoke access from')
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

    await client.removeUserFromProduct({
      email: ctx.input.email,
      productId: ctx.input.productId
    });

    return {
      output: { success: true },
      message: `Removed user **${ctx.input.email}** from product **${ctx.input.productId}**.`
    };
  })
  .build();
