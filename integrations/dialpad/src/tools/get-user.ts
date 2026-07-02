import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific Dialpad user by their ID. Returns profile, status, contact info, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe('The Dialpad user ID. Use "me" to get the authenticated user.')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      emails: z.array(z.string()).optional(),
      phoneNumbers: z.array(z.string()).optional(),
      extension: z.string().optional(),
      state: z.string().optional(),
      isAdmin: z.boolean().optional(),
      isSuperAdmin: z.boolean().optional(),
      isOnline: z.boolean().optional(),
      isAvailable: z.boolean().optional(),
      doNotDisturb: z.boolean().optional(),
      onDutyStatus: z.string().optional(),
      officeId: z.string().optional(),
      companyId: z.string().optional(),
      license: z.string().optional(),
      timezone: z.string().optional(),
      jobTitle: z.string().optional(),
      imageUrl: z.string().optional(),
      dateAdded: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let u = await client.getUser(ctx.input.userId);

    let output = {
      userId: String(u.id),
      firstName: u.first_name,
      lastName: u.last_name,
      displayName: u.display_name,
      emails: u.emails,
      phoneNumbers: u.phone_numbers,
      extension: u.extension,
      state: u.state,
      isAdmin: u.is_admin,
      isSuperAdmin: u.is_super_admin,
      isOnline: u.is_online,
      isAvailable: u.is_available,
      doNotDisturb: u.do_not_disturb,
      onDutyStatus: u.on_duty_status,
      officeId: u.office_id ? String(u.office_id) : undefined,
      companyId: u.company_id ? String(u.company_id) : undefined,
      license: u.license,
      timezone: u.timezone,
      jobTitle: u.job_title,
      imageUrl: u.image_url,
      dateAdded: u.date_added
    };

    return {
      output,
      message: `Retrieved user **${u.display_name || u.first_name || u.id}** (${u.state || 'unknown state'})`
    };
  })
  .build();
