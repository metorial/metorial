import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing Brightspace user's details such as name, email, username, activation status, or org-defined ID. Only provide the fields you want to change.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      userId: z.string().describe('Brightspace user ID to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      userName: z.string().optional().describe('Updated username'),
      externalEmail: z.string().optional().describe('Updated external email'),
      orgDefinedId: z.string().optional().describe('Updated org-defined ID'),
      middleName: z.string().optional().describe('Updated middle name'),
      isActive: z.boolean().optional().describe('Set user active/inactive')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the updated user'),
      userName: z.string().optional().describe('Updated username'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let updateData: any = {};
    if (ctx.input.firstName !== undefined) updateData.FirstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updateData.LastName = ctx.input.lastName;
    if (ctx.input.userName !== undefined) updateData.UserName = ctx.input.userName;
    if (ctx.input.externalEmail !== undefined)
      updateData.ExternalEmail = ctx.input.externalEmail;
    if (ctx.input.orgDefinedId !== undefined) updateData.OrgDefinedId = ctx.input.orgDefinedId;
    if (ctx.input.middleName !== undefined) updateData.MiddleName = ctx.input.middleName;
    if (ctx.input.isActive !== undefined)
      updateData.Activation = { IsActive: ctx.input.isActive };

    let user = await client.updateUser(ctx.input.userId, updateData);

    return {
      output: {
        userId: String(user.UserId),
        userName: user.UserName,
        firstName: user.FirstName,
        lastName: user.LastName
      },
      message: `Updated user **${user.FirstName} ${user.LastName}** (ID: ${user.UserId}).`
    };
  })
  .build();
