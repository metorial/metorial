import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

type EmailAddress = {
  email_address_id: number;
  email_address: string;
  verified: number | string | boolean;
  date_added?: number | string;
};

export let listEmailAddressesTool = SlateTool.create(spec, {
  name: 'List Email Sender Addresses',
  key: 'list_email_addresses',
  description:
    'Find allowed sender email addresses, their verification status, and IDs for send_email. Transactional email is available only to existing customers with access to this service.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Addresses per page, up to 100')
    })
  )
  .output(
    z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number(),
      addresses: z.array(
        z.object({
          emailAddressId: z.number(),
          emailAddress: z.string(),
          verified: z.boolean(),
          createdAt: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient(ctx.auth);
    let result = await client.getAllowedEmailAddresses(ctx.input);
    let data = result.data;
    let rows: EmailAddress[] = data?.data ?? [];
    let addresses = rows.map(address => ({
      emailAddressId: address.email_address_id,
      emailAddress: address.email_address,
      verified: address.verified === true || Number(address.verified) === 1,
      createdAt: address.date_added == null ? undefined : Number(address.date_added)
    }));
    return {
      output: {
        currentPage: data?.current_page ?? 1,
        totalPages: data?.last_page ?? 1,
        totalCount: data?.total ?? addresses.length,
        addresses
      },
      message: `Found ${addresses.length} sender email address(es).`
    };
  })
  .build();
