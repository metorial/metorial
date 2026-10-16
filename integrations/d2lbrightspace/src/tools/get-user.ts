import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { responseItems } from '../lib/response';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a Brightspace user's details by their user ID, or look up users by username, email, or org-defined ID. Can also retrieve the current authenticated user's information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'Brightspace user ID to retrieve. If omitted, returns the current authenticated user.'
        ),
      userName: z.string().optional().describe('Look up a user by their username'),
      externalEmail: z
        .string()
        .optional()
        .describe('Look up a user by their external email address'),
      orgDefinedId: z
        .string()
        .optional()
        .describe('Look up a user by their organization-defined ID')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('The user ID'),
      userName: z.string().optional().describe('The username'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      externalEmail: z.string().optional().describe('External email address'),
      orgDefinedId: z.string().optional().describe('Organization-defined ID'),
      isActive: z.boolean().optional().describe('Whether the user is active'),
      uniqueName: z.string().optional().describe('Unique identifier name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      return {
        output: {
          userId: String(user.UserId),
          userName: user.UserName ?? undefined,
          firstName: user.FirstName ?? undefined,
          lastName: user.LastName ?? undefined,
          externalEmail: user.ExternalEmail ?? undefined,
          orgDefinedId: user.OrgDefinedId ?? undefined,
          isActive: user.Activation?.IsActive ?? undefined
        },
        message: `Retrieved user **${user.FirstName} ${user.LastName}** (ID: ${user.UserId}).`
      };
    }

    if (ctx.input.userName || ctx.input.externalEmail || ctx.input.orgDefinedId) {
      let result = await client.listUsers({
        userName: ctx.input.userName,
        externalEmail: ctx.input.externalEmail,
        orgDefinedId: ctx.input.orgDefinedId
      });

      let items = responseItems(result);
      let user = items[0];

      if (!user) {
        return {
          output: {},
          message: 'No user found matching the specified criteria.'
        };
      }

      return {
        output: {
          userId: String(user.UserId),
          userName: user.UserName ?? undefined,
          firstName: user.FirstName ?? undefined,
          lastName: user.LastName ?? undefined,
          externalEmail: user.ExternalEmail ?? undefined,
          orgDefinedId: user.OrgDefinedId ?? undefined,
          isActive: user.Activation?.IsActive ?? undefined
        },
        message: `Found user **${user.FirstName} ${user.LastName}** (ID: ${user.UserId}).`
      };
    }

    let whoami = await client.getWhoAmI();
    return {
      output: {
        userId: String(whoami.Identifier),
        firstName: whoami.FirstName ?? undefined,
        lastName: whoami.LastName ?? undefined,
        uniqueName: whoami.UniqueName ?? undefined
      },
      message: `Current user: **${whoami.FirstName} ${whoami.LastName}** (ID: ${whoami.Identifier}).`
    };
  })
  .build();
