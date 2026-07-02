import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { requireBrazeArray } from '../lib/errors';
import { spec } from '../spec';

export let manageSmsInvalidPhoneNumbers = SlateTool.create(spec, {
  name: 'Manage SMS Invalid Phone Numbers',
  key: 'manage_sms_invalid_phone_numbers',
  description: `Query or remove phone numbers from Braze's invalid SMS phone number list.`,
  instructions: [
    'Use action "list" to query invalid phone numbers.',
    'Use action "remove" with phones to remove numbers from the invalid phone number list.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'remove']).describe('Operation to perform'),
      phones: z
        .array(z.string())
        .optional()
        .describe('Phone numbers in E.164 format to remove for remove action'),
      phone: z.string().optional().describe('Single phone number filter for list action'),
      startDate: z.string().optional().describe('Start date for listing (YYYY-MM-DD format)'),
      endDate: z.string().optional().describe('End date for listing (YYYY-MM-DD format)'),
      limit: z.number().optional().describe('Max results to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      phones: z.array(z.any()).optional().describe('Invalid phone numbers returned'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.listInvalidPhoneNumbers({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        phone: ctx.input.phone
      });

      return {
        output: {
          phones: result.phones ?? result.phone_numbers ?? [],
          message: result.message
        },
        message: `Found **${(result.phones ?? result.phone_numbers ?? []).length}** invalid phone number(s).`
      };
    }

    let phones = requireBrazeArray(ctx.input.phones, 'phones', 'remove');
    let result = await client.removeInvalidPhoneNumbers(phones);

    return {
      output: {
        message: result.message
      },
      message: `Removed **${phones.length}** phone number(s) from the invalid SMS list.`
    };
  })
  .build();
