import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bulkSignerSchema = z.object({
  role: z.string().describe('Template signer role name to assign this signer to'),
  name: z.string().describe('Full name of the signer'),
  emailAddress: z.string().describe('Email address of the signer'),
  pin: z.string().optional().describe('Access code for the signer')
});

let bulkCustomFieldSchema = z.object({
  name: z.string().describe('Name of the template merge field'),
  value: z.string().describe('Value to pre-fill')
});

let bulkCcSchema = z.object({
  role: z.string().describe('Template CC role name'),
  emailAddress: z.string().describe('Email address of the CC recipient')
});

export let bulkSendTemplateRequest = SlateTool.create(spec, {
  name: 'Bulk Send Template Request',
  key: 'bulk_send_template_request',
  description: `Create a Dropbox Sign bulk send job from one or more templates. Each signer list entry creates one signature request, optionally as embedded signing requests when clientId and embeddedSigning are provided.`,
  instructions: [
    'Template IDs and signer roles must match existing Dropbox Sign templates.',
    'Use testMode=true for testing.',
    'Bulk send requires Dropbox Sign Standard plan or higher.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIds: z.array(z.string()).min(1).describe('IDs of the templates to use'),
      signerList: z
        .array(
          z.object({
            signers: z
              .array(bulkSignerSchema)
              .min(1)
              .describe('Template role assignments for one generated request'),
            customFields: z
              .array(bulkCustomFieldSchema)
              .optional()
              .describe('Template merge field values for this generated request')
          })
        )
        .min(1)
        .max(250)
        .describe('Generated request definitions. Dropbox Sign supports up to 250.'),
      title: z.string().optional().describe('Title for generated signature requests'),
      subject: z.string().optional().describe('Subject line of the email'),
      message: z.string().optional().describe('Message body of the email'),
      ccs: z.array(bulkCcSchema).optional().describe('CC recipients mapped to template roles'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata pairs'),
      signingRedirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect signers to after signing'),
      testMode: z.boolean().optional().describe('Enable test mode'),
      clientId: z.string().optional().describe('API App client ID'),
      embeddedSigning: z
        .boolean()
        .optional()
        .describe('Create embedded signing requests instead of email signing requests')
    })
  )
  .output(
    z.object({
      bulkSendJobId: z.string().describe('Unique identifier of the created bulk send job'),
      total: z.number().optional().describe('Number of signature requests in the job'),
      isCreator: z
        .boolean()
        .optional()
        .describe('Whether the authenticated account created it'),
      createdAt: z.string().optional().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.bulkSendSignatureRequestWithTemplate({
      templateIds: ctx.input.templateIds,
      signerList: ctx.input.signerList,
      title: ctx.input.title,
      subject: ctx.input.subject,
      message: ctx.input.message,
      ccs: ctx.input.ccs,
      metadata: ctx.input.metadata,
      signingRedirectUrl: ctx.input.signingRedirectUrl,
      testMode: ctx.input.testMode,
      clientId: ctx.input.clientId,
      embeddedSigning: ctx.input.embeddedSigning
    });

    return {
      output: {
        bulkSendJobId: result.bulk_send_job_id,
        total: result.total,
        isCreator: result.is_creator,
        createdAt: result.created_at
          ? new Date(result.created_at * 1000).toISOString()
          : undefined
      },
      message: `Bulk send job **${result.bulk_send_job_id}** created for ${result.total ?? ctx.input.signerList.length} request(s).`
    };
  })
  .build();
