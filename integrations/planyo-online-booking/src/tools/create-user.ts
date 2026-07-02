import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Creates a new customer user or updates an existing user's custom properties. If a user with the given email already exists, their custom properties and personal details are updated (login credentials remain unchanged).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('User email address'),
      firstName: z.string().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      country: z.string().optional().describe('Country (2-letter ISO code)'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      zip: z.string().optional().describe('Zip/postal code'),
      state: z.string().optional().describe('State/province'),
      phone: z.string().optional().describe('Phone number'),
      phoneCountryCode: z.string().optional().describe('Phone country code'),
      mobile: z.string().optional().describe('Mobile number'),
      mobileCountryCode: z.string().optional().describe('Mobile country code'),
      language: z.string().optional().describe('Preferred language (2-letter ISO 639-1 code)'),
      customProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom user properties as key-value pairs')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      isNew: z
        .boolean()
        .describe('Whether the user was newly created (false if existing user was updated)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.addUser({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
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
      customProperties: ctx.input.customProperties
    });

    let isNew = result.is_new === 1;

    return {
      output: {
        userId: String(result.user_id),
        isNew
      },
      message: isNew
        ? `New user **${ctx.input.firstName} ${ctx.input.lastName || ''}** created (ID: ${result.user_id}).`
        : `Existing user updated (ID: ${result.user_id}).`
    };
  })
  .build();
