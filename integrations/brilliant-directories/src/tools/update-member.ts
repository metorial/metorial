import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update an existing member's profile in the directory. Supports updating standard fields as well as custom fields and member credits.
Invalid URL formats for website or social media fields will be skipped by the system.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID of the member to update.'),
      email: z.string().optional().describe('Updated email address.'),
      firstName: z.string().optional().describe('Updated first name.'),
      lastName: z.string().optional().describe('Updated last name.'),
      phone: z.string().optional().describe('Updated phone number.'),
      company: z.string().optional().describe('Updated company name.'),
      website: z.string().optional().describe('Updated website URL.'),
      address: z.string().optional().describe('Updated street address.'),
      city: z.string().optional().describe('Updated city.'),
      state: z.string().optional().describe('Updated state or province.'),
      zip: z.string().optional().describe('Updated zip or postal code.'),
      country: z.string().optional().describe('Updated country.'),
      subscriptionId: z.string().optional().describe('Updated membership plan ID.'),
      credits: z
        .number()
        .optional()
        .describe('Set the member credit balance to this value (overrides current credits).'),
      addCredits: z.number().optional().describe('Number of credits to add to the member.'),
      deductCredits: z
        .number()
        .optional()
        .describe('Number of credits to deduct from the member.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional custom fields to update as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('The complete provider response, including any pagination metadata.'),
      member: z.any().describe('The updated member record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      user_id: ctx.input.userId
    };

    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.phone) data.phone_number = ctx.input.phone;
    if (ctx.input.company) data.company = ctx.input.company;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.address) data.address1 = ctx.input.address;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.state) data.state_code = ctx.input.state;
    if (ctx.input.zip) data.zip_code = ctx.input.zip;
    if (ctx.input.country) data.country_code = ctx.input.country;
    if (ctx.input.subscriptionId) data.subscription_id = ctx.input.subscriptionId;
    let creditChanges = [
      ['override', ctx.input.credits],
      ['add', ctx.input.addCredits],
      ['deduct', ctx.input.deductCredits]
    ].filter(([, amount]) => amount !== undefined);
    if (creditChanges.length > 1) {
      throw createApiServiceError(
        'Provide only one of credits, addCredits, or deductCredits per update.'
      );
    }
    if (creditChanges.length === 1) {
      let [action, amount] = creditChanges[0]!;
      data.credit_action = action;
      data.credit_amount = amount;
    }
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.updateUser(data);

    return {
      output: {
        status: result.status,
        raw: result,
        member: result.message
      },
      message: `Updated member **${ctx.input.userId}**.`
    };
  })
  .build();
