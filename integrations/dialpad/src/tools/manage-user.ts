import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let manageUserTool = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a Dialpad user. Use this to provision new users, modify user settings (name, DND, office), or remove users from the company.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      userId: z.string().optional().describe('User ID (required for update and delete)'),
      email: z.string().optional().describe('Email address (required for create)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      officeId: z.number().optional().describe('Office ID to assign the user to'),
      license: z.string().optional().describe('License type (e.g., talk, user, lite_lines)'),
      doNotDisturb: z.boolean().optional().describe('Enable or disable Do Not Disturb'),
      jobTitle: z.string().optional().describe('Job title'),
      timezone: z.string().optional().describe('Timezone')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      displayName: z.string().optional(),
      email: z.string().optional(),
      state: z.string().optional(),
      deleted: z.boolean().optional().describe('True if the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let {
      action,
      userId,
      email,
      firstName,
      lastName,
      officeId,
      license,
      doNotDisturb,
      jobTitle,
      timezone
    } = ctx.input;

    if (action === 'create') {
      if (!email) throw new Error('Email is required to create a user');

      let user = await client.createUser({
        email,
        first_name: firstName,
        last_name: lastName,
        office_id: officeId,
        license
      });

      return {
        output: {
          userId: String(user.id),
          displayName: user.display_name,
          email: user.emails?.[0],
          state: user.state
        },
        message: `Created user **${user.display_name || email}**`
      };
    }

    if (action === 'update') {
      if (!userId) throw new Error('User ID is required to update a user');

      let updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (officeId !== undefined) updateData.office_id = officeId;
      if (license !== undefined) updateData.license = license;
      if (doNotDisturb !== undefined) updateData.do_not_disturb = doNotDisturb;
      if (jobTitle !== undefined) updateData.job_title = jobTitle;
      if (timezone !== undefined) updateData.timezone = timezone;

      let user = await client.updateUser(userId, updateData);

      return {
        output: {
          userId: String(user.id),
          displayName: user.display_name,
          email: user.emails?.[0],
          state: user.state
        },
        message: `Updated user **${user.display_name || userId}**`
      };
    }

    if (action === 'delete') {
      if (!userId) throw new Error('User ID is required to delete a user');

      await client.deleteUser(userId);

      return {
        output: {
          userId,
          deleted: true
        },
        message: `Deleted user **${userId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
