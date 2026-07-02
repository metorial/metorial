import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMember = SlateTool.create(spec, {
  name: 'Create Member',
  key: 'create_member',
  description: `Create a new member (user) in the directory. Requires an email, password, and subscription (membership plan) ID at minimum.
Additional profile fields can be provided. The membership plan settings are respected unless overriding data is sent.`,
  instructions: [
    'The password must be at least 6 characters long.',
    'The subscriptionId must reference an existing Membership Plan ID.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new member.'),
      password: z.string().describe('Password for the new member (minimum 6 characters).'),
      subscriptionId: z.string().describe('The Membership Plan ID to assign to the member.'),
      firstName: z.string().optional().describe('First name of the member.'),
      lastName: z.string().optional().describe('Last name of the member.'),
      phone: z.string().optional().describe('Phone number of the member.'),
      company: z.string().optional().describe('Company or business name.'),
      website: z.string().optional().describe('Website URL.'),
      address: z.string().optional().describe('Street address.'),
      city: z.string().optional().describe('City.'),
      state: z.string().optional().describe('State or province.'),
      zip: z.string().optional().describe('Zip or postal code.'),
      country: z.string().optional().describe('Country.'),
      sendWelcomeEmail: z
        .boolean()
        .optional()
        .describe('Whether to trigger the welcome email. Defaults to false.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional custom fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      member: z.any().describe('The newly created member record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      email: ctx.input.email,
      password: ctx.input.password,
      subscription_id: ctx.input.subscriptionId
    };

    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.phone) data.phone = ctx.input.phone;
    if (ctx.input.company) data.company = ctx.input.company;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.address) data.address = ctx.input.address;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.state) data.state = ctx.input.state;
    if (ctx.input.zip) data.zip = ctx.input.zip;
    if (ctx.input.country) data.country = ctx.input.country;
    if (ctx.input.sendWelcomeEmail) data.send_welcome_email = '1';
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.createUser(data);

    return {
      output: {
        status: result.status,
        member: result.message
      },
      message: `Created new member with email **${ctx.input.email}**.`
    };
  })
  .build();
