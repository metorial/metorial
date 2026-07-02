import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve full details of a specific customer profile by ID. Returns contact information, address, notes, preferences, and group memberships.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().describe('The ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      customerId: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      companyName: z.string().optional(),
      nickname: z.string().optional(),
      emailAddress: z.string().optional(),
      phoneNumber: z.string().optional(),
      address: z.record(z.string(), z.any()).optional(),
      note: z.string().optional(),
      referenceId: z.string().optional(),
      birthday: z.string().optional(),
      groups: z.array(z.record(z.string(), z.any())).optional(),
      segmentIds: z.array(z.string()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      version: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let c = await client.getCustomer(ctx.input.customerId);

    return {
      output: {
        customerId: c.id,
        givenName: c.given_name,
        familyName: c.family_name,
        companyName: c.company_name,
        nickname: c.nickname,
        emailAddress: c.email_address,
        phoneNumber: c.phone_number,
        address: c.address,
        note: c.note,
        referenceId: c.reference_id,
        birthday: c.birthday,
        groups: c.groups,
        segmentIds: c.segment_ids,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        version: c.version
      },
      message: `Customer **${c.id}** — ${[c.given_name, c.family_name].filter(Boolean).join(' ') || c.email_address || c.company_name || 'Unknown'}`
    };
  })
  .build();
