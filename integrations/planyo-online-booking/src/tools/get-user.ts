import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieves detailed information about a customer user by ID or email, including personal details, contact info, custom properties, and reservation count.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('User ID (one of userId or email required)'),
      email: z.string().optional().describe('User email (one of userId or email required)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      email: z.string().optional().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      login: z.string().optional().describe('Login username'),
      registrationTime: z.string().optional().describe('Registration timestamp'),
      isEmailVerified: z.boolean().optional().describe('Whether email is verified'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      zip: z.string().optional().describe('Zip/postal code'),
      state: z.string().optional().describe('State/province'),
      country: z.string().optional().describe('Country code'),
      language: z.string().optional().describe('Preferred language'),
      phoneNumber: z.string().optional().describe('Phone number'),
      mobileNumber: z.string().optional().describe('Mobile number'),
      reservationCount: z.number().optional().describe('Total number of reservations'),
      properties: z.any().optional().describe('Custom user properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let r = await client.getUserData({
      userId: ctx.input.userId,
      email: ctx.input.email,
      detailLevel: 13 // 1 (user info) + 4 (properties) + 8 (reservation info)
    });

    return {
      output: {
        userId: String(r.id),
        email: r.email,
        firstName: r.first_name,
        lastName: r.last_name,
        login: r.login,
        registrationTime: r.registration_time,
        isEmailVerified:
          r.is_email_verified != null ? Boolean(r.is_email_verified) : undefined,
        address: r.address,
        city: r.city,
        zip: r.zip,
        state: r.state,
        country: r.country,
        language: r.language,
        phoneNumber: r.phone_number,
        mobileNumber: r.mobile_number,
        reservationCount:
          r.reservation_count != null ? Number(r.reservation_count) : undefined,
        properties: r.properties
      },
      message: `Retrieved user **${r.first_name || ''} ${r.last_name || ''}** (${r.email}, ID: ${r.id}).${r.reservation_count != null ? ` ${r.reservation_count} reservation(s).` : ''}`
    };
  })
  .build();
