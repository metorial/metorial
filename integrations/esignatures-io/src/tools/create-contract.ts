import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerSchema = z.object({
  name: z.string().describe('Full name of the signer'),
  email: z.string().optional().describe('Email address of the signer'),
  mobile: z
    .string()
    .optional()
    .describe('Mobile phone number with country code (e.g., +12481234567)'),
  companyName: z.string().optional().describe('Company name of the signer'),
  signingOrder: z
    .string()
    .optional()
    .describe('Order in which this signer should sign (e.g., "1", "2")'),
  autoSign: z
    .enum(['yes', 'no'])
    .optional()
    .describe('Whether this signer should auto-sign (typically the sender)'),
  signatureRequestDeliveryMethods: z
    .array(z.enum(['email', 'sms']))
    .optional()
    .describe('How to deliver the signature request'),
  signedDocumentDeliveryMethod: z
    .enum(['email', 'no_delivery'])
    .optional()
    .describe('How to deliver the final signed document'),
  multiFactorAuthentications: z
    .array(z.enum(['sms_verification_code', 'email_verification_code', 'photo_id']))
    .optional()
    .describe('MFA methods for signer identity verification'),
  redirectUrl: z.string().optional().describe('URL to redirect the signer to after signing')
});

let placeholderFieldSchema = z.object({
  apiKey: z.string().describe('The placeholder key defined in the template'),
  value: z.string().describe('The value to insert for this placeholder')
});

let signerFieldSchema = z.object({
  signerFieldId: z.string().describe('The signer field ID defined in the template'),
  defaultValue: z.string().describe('Default value to pre-fill for this field')
});

let emailsSchema = z
  .object({
    signatureRequestSubject: z
      .string()
      .optional()
      .describe('Custom subject line for signature request email'),
    signatureRequestText: z
      .string()
      .optional()
      .describe(
        'Custom body text for signature request email. Use __FULL_NAME__ for dynamic name insertion.'
      ),
    finalContractSubject: z
      .string()
      .optional()
      .describe('Custom subject line for the signed contract email'),
    finalContractText: z
      .string()
      .optional()
      .describe(
        'Custom body text for the signed contract email. Use __FULL_NAME__ for dynamic name insertion.'
      ),
    ccEmailAddresses: z
      .array(z.string())
      .optional()
      .describe('Email addresses to CC on the signed PDF'),
    replyTo: z.string().optional().describe('Custom reply-to email address')
  })
  .optional();

let customBrandingSchema = z
  .object({
    companyName: z.string().optional().describe('Custom company name for white-labeling'),
    logoUrl: z.string().optional().describe('URL to a custom logo for branding')
  })
  .optional();

let contractSignerOutputSchema = z.object({
  signerId: z.string().describe('Unique ID of the signer'),
  name: z.string().describe('Name of the signer'),
  email: z.string().optional().describe('Email of the signer'),
  mobile: z.string().optional().describe('Mobile number of the signer'),
  companyName: z.string().optional().describe('Company name of the signer'),
  signPageUrl: z
    .string()
    .optional()
    .describe(
      'URL for the signer to sign the contract (can be embedded in an iframe with ?embedded=yes)'
    )
});

export let createContract = SlateTool.create(spec, {
  name: 'Create Contract',
  key: 'create_contract',
  description: `Creates a new contract from a template and sends it to signers for electronic signature. Supports dynamic placeholder values, custom emails, branding, MFA, delivery methods, and embedded signing.`,
  instructions: [
    'Use the template ID from an existing template. List templates first if you need to find the right one.',
    'At least one signer is required. Provide email and/or mobile for delivery.',
    'Use placeholderFields to inject dynamic values into template placeholders.',
    'Set saveAsDraft to "yes" to create without immediately sending to signers.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to create the contract from'),
      signers: z.array(signerSchema).min(1).describe('List of signers for the contract'),
      title: z.string().optional().describe('Title of the contract'),
      locale: z.string().optional().describe('Language locale (e.g., "en", "fr", "de")'),
      metadata: z
        .string()
        .optional()
        .describe('Custom metadata string for tracking (e.g., an internal ID)'),
      expiresInHours: z
        .string()
        .optional()
        .describe('Number of hours until the contract expires'),
      customWebhookUrl: z
        .string()
        .optional()
        .describe('Custom webhook URL for this specific contract'),
      assignedUserEmail: z
        .string()
        .optional()
        .describe('Email of the assigned user in the eSignatures account'),
      labels: z.array(z.string()).optional().describe('Labels for organizing the contract'),
      test: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Set to "yes" to create a test/demo contract'),
      saveAsDraft: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Set to "yes" to save as draft without sending'),
      placeholderFields: z
        .array(placeholderFieldSchema)
        .optional()
        .describe('Values for template placeholder fields'),
      signerFields: z
        .array(signerFieldSchema)
        .optional()
        .describe('Default values for signer input fields'),
      emails: emailsSchema.describe('Custom email settings'),
      customBranding: customBrandingSchema.describe('Custom branding for white-labeling')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('Unique ID of the created contract'),
      status: z.string().describe('Current status of the contract'),
      title: z.string().optional().describe('Title of the contract'),
      metadata: z.string().optional().describe('Custom metadata'),
      signers: z
        .array(contractSignerOutputSchema)
        .optional()
        .describe('List of signers with their sign page URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Creating contract from template...');

    let result = await client.createContract(ctx.input);

    let contract = result?.data?.contract || result?.contract || result;

    let signers = (contract?.signers || []).map((s: any) => ({
      signerId: s.id,
      name: s.name,
      email: s.email,
      mobile: s.mobile,
      companyName: s.companyName,
      signPageUrl: s.signPageUrl
    }));

    let output = {
      contractId: contract?.id || '',
      status: contract?.status || result?.status || 'queued',
      title: contract?.title,
      metadata: contract?.metadata,
      signers
    };

    let signerNames = signers.map((s: any) => s.name).join(', ');

    return {
      output,
      message: `Contract **${output.title || output.contractId}** created successfully (status: ${output.status}). Signers: ${signerNames || 'none'}.`
    };
  })
  .build();
