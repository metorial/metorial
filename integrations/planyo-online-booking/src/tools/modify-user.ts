import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let modifyUser = SlateTool.create(spec, {
  name: 'Modify User',
  key: 'modify_user',
  description: `Modifies an existing user's personal details, contact info, custom properties, and account flags. Identify the user by ID or email.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('User ID (one of userId or email required)'),
      email: z.string().optional().describe('User email (one of userId or email required)'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      newEmail: z.string().optional().describe('New email address'),
      country: z.string().optional().describe('Country (2-letter ISO code)'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      zip: z.string().optional().describe('Zip/postal code'),
      state: z.string().optional().describe('State/province'),
      phone: z.string().optional().describe('Phone number'),
      phoneCountryCode: z.string().optional().describe('Phone country code'),
      mobile: z.string().optional().describe('Mobile number'),
      mobileCountryCode: z.string().optional().describe('Mobile country code'),
      language: z.string().optional().describe('Preferred language (2-letter code)'),
      emailVerified: z.boolean().optional().describe('Set email verification status'),
      isPreapproved: z.boolean().optional().describe('Set preapproval status'),
      isBanned: z.boolean().optional().describe('Set banned status'),
      customProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom user properties to update')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Updated user ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.modifyUser({
      userId: ctx.input.userId,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      newEmail: ctx.input.newEmail,
      country: ctx.input.country,
      address: ctx.input.address,
      city: ctx.input.city,
      zip: ctx.input.zip,
      state: ctx.input.state,
      phone: ctx.input.phone,
      phoneCountryCode: ctx.input.phoneCountryCode,
      mobile: ctx.input.mobile,
      mobileCountryCode: ctx.input.mobileCountryCode,
      language: ctx.input.language,
      emailVerified: ctx.input.emailVerified,
      isPreapproved: ctx.input.isPreapproved,
      isBanned: ctx.input.isBanned,
      customProperties: ctx.input.customProperties
    });

    return {
      output: {
        userId: String(result.user_id || result)
      },
      message: `User **${ctx.input.userId || ctx.input.email}** modified successfully.`
    };
  })
  .build();
