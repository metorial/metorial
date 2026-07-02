import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let phoneNumberSchema = z.object({
  phoneNumberId: z.string().describe('Unique identifier of the phone number'),
  phoneNumber: z.string().describe('Phone number in E.164 format'),
  usageType: z
    .string()
    .describe(
      'Usage type of the phone number (e.g. MainCompanyNumber, DirectNumber, ForwardedNumber)'
    ),
  type: z.string().describe('Type of the phone number (e.g. VoiceFax, VoiceOnly, FaxOnly)'),
  label: z.string().optional().describe('Custom label for the phone number'),
  primary: z
    .boolean()
    .optional()
    .describe('Whether this is the primary phone number for the extension')
});

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List phone numbers assigned to a RingCentral extension. Returns all phone numbers associated with the specified extension, or the current user's extension if no extension ID is provided.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      extensionId: z
        .string()
        .optional()
        .describe('Extension ID to list phone numbers for (defaults to current user)')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(phoneNumberSchema)
        .describe('List of phone numbers assigned to the extension')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listPhoneNumbers(ctx.input.extensionId);

    let phoneNumbers = (result.records || []).map((r: any) => ({
      phoneNumberId: r.id,
      phoneNumber: r.phoneNumber,
      usageType: r.usageType,
      type: r.type,
      label: r.label,
      primary: r.primary
    }));

    return {
      output: { phoneNumbers },
      message: `Found **${phoneNumbers.length}** phone number${phoneNumbers.length === 1 ? '' : 's'} for the extension.`
    };
  })
  .build();
