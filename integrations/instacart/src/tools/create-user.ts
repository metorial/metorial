import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create Connect User',
  key: 'create_user',
  description: `Create a Connect user account with an associated delivery address. Connect users are required before placing orders. The user ID you provide must be unique across all retailer customers.

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  instructions: [
    'The userId is defined by you but must be unique for all retailer customers.',
    'At minimum, provide userId, firstName, addressLine1, and postalCode.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Unique user identifier (defined by you)'),
      firstName: z.string().describe('Customer first name (no special chars: /:<>$%?)'),
      lastName: z.string().optional().describe('Customer last name'),
      phoneNumber: z.string().optional().describe('Customer phone number'),
      locale: z.string().optional().describe('Customer locale in IETF format (e.g., "en-US")'),
      addressLine1: z.string().describe('Primary address line'),
      addressLine2: z
        .string()
        .optional()
        .describe('Secondary address line (apt, suite, etc.)'),
      addressType: z.string().optional().describe('Address type (e.g., "residential")'),
      postalCode: z.string().describe('Postal/zip code'),
      city: z.string().optional().describe('City or town name')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The Connect user ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createUserWithAddress(ctx.input);

    return {
      output: result,
      message: `Connect user created: **${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''}** (ID: ${result.userId}) at ${ctx.input.addressLine1}, ${ctx.input.postalCode}.`
    };
  })
  .build();
