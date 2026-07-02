import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { spec } from '../spec';

let verifyServiceSchema = z.object({
  serviceSid: z.string().describe('Unique SID of the Verify Service (starts with VA)'),
  friendlyName: z.string().describe('Friendly name shown in verification messages'),
  codeLength: z.number().nullable().describe('Generated verification code length'),
  lookupEnabled: z
    .boolean()
    .nullable()
    .describe('Whether Lookup is enabled for verifications'),
  psd2Enabled: z.boolean().nullable().describe('Whether PSD2 mode is enabled'),
  skipSmsToLandlines: z
    .boolean()
    .nullable()
    .describe('Whether SMS verifications skip landline numbers'),
  dtmfInputRequired: z
    .boolean()
    .nullable()
    .describe('Whether voice verifications require DTMF'),
  defaultTemplateSid: z.string().nullable().describe('Default Verify template SID'),
  dateCreated: z.string().nullable().describe('Date the service was created'),
  dateUpdated: z.string().nullable().describe('Date the service was last updated')
});

export let listVerifyServices = SlateTool.create(spec, {
  name: 'List Verify Services',
  key: 'list_verify_services',
  description: `List Twilio Verify Services so you can discover the Service SID required by Send Verification and Check Verification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .optional()
        .describe('Number of Verify Services to return per page (max 1000, default 50).')
    })
  )
  .output(
    z.object({
      services: z.array(verifyServiceSchema).describe('Verify Services'),
      hasMore: z.boolean().describe('Whether more Verify Services are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.listVerifyServices({
      pageSize: ctx.input.pageSize
    });

    let services = (result.services || []).map((service: any) => ({
      serviceSid: service.sid,
      friendlyName: service.friendly_name,
      codeLength: service.code_length ?? null,
      lookupEnabled: service.lookup_enabled ?? null,
      psd2Enabled: service.psd2_enabled ?? null,
      skipSmsToLandlines: service.skip_sms_to_landlines ?? null,
      dtmfInputRequired: service.dtmf_input_required ?? null,
      defaultTemplateSid: service.default_template_sid || null,
      dateCreated: service.date_created || null,
      dateUpdated: service.date_updated || null
    }));

    return {
      output: { services, hasMore: !!result.meta?.next_page_url },
      message: `Found **${services.length}** Verify Service(s).`
    };
  })
  .build();
