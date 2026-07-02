import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List all phone numbers associated with your WhatsApp Business Account, including their verified names, display numbers, quality ratings, and verification status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      phoneNumbers: z.array(
        z.object({
          phoneNumberId: z.string().describe('Phone number ID'),
          verifiedName: z.string().optional().describe('Verified business name'),
          displayPhoneNumber: z.string().optional().describe('Display phone number'),
          qualityRating: z.string().optional().describe('Quality rating (GREEN, YELLOW, RED)'),
          codeVerificationStatus: z.string().optional().describe('Code verification status')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listPhoneNumbers();

    let phoneNumbers = (result.data ?? []).map((pn: any) => ({
      phoneNumberId: pn.id,
      verifiedName: pn.verified_name,
      displayPhoneNumber: pn.display_phone_number,
      qualityRating: pn.quality_rating,
      codeVerificationStatus: pn.code_verification_status
    }));

    return {
      output: { phoneNumbers },
      message: `Found **${phoneNumbers.length}** phone number(s) in your WhatsApp Business Account.`
    };
  })
  .build();

export let getPhoneNumber = SlateTool.create(spec, {
  name: 'Get Phone Number',
  key: 'get_phone_number',
  description: `Get details of a specific phone number registered with your WhatsApp Business Account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumberId: z.string().describe('Phone number ID to retrieve')
    })
  )
  .output(
    z.object({
      phoneNumberId: z.string(),
      verifiedName: z.string().optional(),
      displayPhoneNumber: z.string().optional(),
      qualityRating: z.string().optional(),
      codeVerificationStatus: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getPhoneNumber(ctx.input.phoneNumberId);

    return {
      output: {
        phoneNumberId: result.id,
        verifiedName: result.verified_name,
        displayPhoneNumber: result.display_phone_number,
        qualityRating: result.quality_rating,
        codeVerificationStatus: result.code_verification_status
      },
      message: `Phone number \`${result.display_phone_number ?? ctx.input.phoneNumberId}\`: Quality **${result.quality_rating ?? 'N/A'}**, Verified: **${result.code_verification_status ?? 'N/A'}**`
    };
  })
  .build();

export let registerPhoneNumber = SlateTool.create(spec, {
  name: 'Register Phone Number',
  key: 'register_phone_number',
  description: `Register a phone number for use with the WhatsApp Business Platform. Requires a 6-digit two-step verification PIN.`,
  constraints: [
    'Limited to 10 register/deregister requests per phone number in a 72-hour window'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumberId: z.string().describe('Phone number ID to register'),
      pin: z.string().describe('6-digit two-step verification PIN')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.registerPhoneNumber(ctx.input.phoneNumberId, ctx.input.pin);

    return {
      output: {
        success: result.success === true
      },
      message: `Registered phone number \`${ctx.input.phoneNumberId}\` successfully.`
    };
  })
  .build();
