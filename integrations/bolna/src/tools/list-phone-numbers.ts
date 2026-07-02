import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List all phone numbers owned in the Bolna account, or search for available phone numbers to purchase in a specific country.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchCountry: z
        .enum(['US', 'IN'])
        .optional()
        .describe('Country to search for available phone numbers (US or IN)'),
      searchPattern: z
        .string()
        .optional()
        .describe('3-character prefix pattern to filter available phone numbers')
    })
  )
  .output(
    z.object({
      ownedNumbers: z
        .array(
          z.object({
            phoneNumberId: z.string().describe('Phone number ID'),
            phoneNumber: z.string().describe('Phone number in E.164 format'),
            agentId: z.string().optional().describe('Agent ID linked to this number'),
            telephonyProvider: z.string().optional().describe('Telephony provider'),
            price: z.string().optional().describe('Monthly renewal price'),
            renewalAt: z.string().optional().describe('Next renewal date'),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('Owned phone numbers'),
      availableNumbers: z
        .array(
          z.object({
            phoneNumber: z.string().describe('Phone number in E.164 format'),
            region: z.string().optional().describe('Geographic region'),
            price: z.number().optional().describe('Price in USD')
          })
        )
        .optional()
        .describe('Available phone numbers for purchase')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.searchCountry) {
      let available = await client.searchPhoneNumbers(
        ctx.input.searchCountry,
        ctx.input.searchPattern
      );
      let availList = Array.isArray(available) ? available : [];

      return {
        output: {
          availableNumbers: availList.map((n: any) => ({
            phoneNumber: n.phone_number,
            region: n.region,
            price: n.price
          }))
        },
        message: `Found **${availList.length}** available phone number(s) in ${ctx.input.searchCountry}.`
      };
    }

    let owned = await client.listPhoneNumbers();
    let ownedList = Array.isArray(owned) ? owned : [];

    return {
      output: {
        ownedNumbers: ownedList.map((n: any) => ({
          phoneNumberId: n.id,
          phoneNumber: n.phone_number,
          agentId: n.agent_id,
          telephonyProvider: n.telephony_provider,
          price: n.price,
          renewalAt: n.renewal_at,
          createdAt: n.created_at
        }))
      },
      message: `Found **${ownedList.length}** owned phone number(s).`
    };
  })
  .build();
