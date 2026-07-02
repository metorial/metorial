import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUserTool = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing tenant/customer account. Modify contact information, address, custom fields, or add a comment to the user's history log. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID to update'),
      email: z.string().optional().describe('Updated email address'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      phone: z.string().optional().describe('Updated phone number'),
      company: z.string().optional().describe('Updated company name'),
      address: z.string().optional().describe('Updated street address'),
      city: z.string().optional().describe('Updated city'),
      region: z.string().optional().describe('Updated state or region'),
      postcode: z.string().optional().describe('Updated postal/ZIP code'),
      country: z.string().optional().describe('Updated country code'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated custom field values'),
      historyComment: z.string().optional().describe('Comment to add to the user history log')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('The updated user account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
    if (ctx.input.firstName !== undefined) updateData.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updateData.lastName = ctx.input.lastName;
    if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
    if (ctx.input.company !== undefined) updateData.company = ctx.input.company;
    if (ctx.input.address !== undefined) updateData.address = ctx.input.address;
    if (ctx.input.city !== undefined) updateData.city = ctx.input.city;
    if (ctx.input.region !== undefined) updateData.region = ctx.input.region;
    if (ctx.input.postcode !== undefined) updateData.postcode = ctx.input.postcode;
    if (ctx.input.country !== undefined) updateData.country = ctx.input.country;
    if (ctx.input.customFields !== undefined) updateData.customFields = ctx.input.customFields;

    let user = await client.updateUser(ctx.input.userId, updateData);

    if (ctx.input.historyComment) {
      await client.addUserComment(ctx.input.userId, ctx.input.historyComment);
    }

    return {
      output: { user },
      message: `Updated user **${user.firstName || ''} ${user.lastName || ''}** (${user._id}).${ctx.input.historyComment ? ' Added history comment.' : ''}`
    };
  })
  .build();
