import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's information including name, contact details, communication preference, tags, and custom identifiers. Only provided fields will be updated. Note: setting tags will overwrite all existing tags.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to update'),
      email: z.string().optional().describe('Updated email address'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      phone: z.string().optional().describe('Updated phone number'),
      preference: z
        .enum(['email', 'sms'])
        .optional()
        .describe('Updated communication preference'),
      customId: z.string().optional().describe('Updated custom identifier'),
      jobId: z.string().optional().describe('Updated job identifier'),
      tags: z
        .string()
        .optional()
        .describe('Updated tags (comma-separated). This overwrites existing tags.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.updateCustomer({
      customerId: ctx.input.customerId,
      customerEmail: ctx.input.email,
      customerFirstName: ctx.input.firstName,
      customerLastName: ctx.input.lastName,
      customerPhoneNumber: ctx.input.phone,
      customerPreference: ctx.input.preference,
      customerCustomId: ctx.input.customId,
      customerJobId: ctx.input.jobId,
      customerTags: ctx.input.tags
    });

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to update customer: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: { success: true },
      message: `Customer **${ctx.input.customerId}** updated successfully.`
    };
  })
  .build();
