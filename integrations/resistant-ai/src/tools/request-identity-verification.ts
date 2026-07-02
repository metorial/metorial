import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let requestIdentityVerification = SlateTool.create(spec, {
  name: 'Request Identity Verification',
  key: 'request_identity_verification',
  description: `Sends a KYC identity verification request to an individual via email. The recipient receives a unique URL to complete the verification by photographing their government-issued ID and taking a selfie. Supports biometric (document + selfie) or document-only verification modes. Results are delivered asynchronously via webhook once the individual completes the process.`,
  instructions: [
    'Provide the email address of the individual to verify. First and last name are optional but recommended for matching.',
    'Use "biometric" verification type for highest assurance (document + selfie). Use "document_only" for document-based verification without selfie.',
    'A referenceId can be provided to correlate this verification with your own system records.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the individual to verify'),
      firstName: z.string().optional().describe('First name of the individual'),
      lastName: z.string().optional().describe('Last name of the individual'),
      verificationType: z
        .enum(['biometric', 'document_only'])
        .optional()
        .describe(
          'Type of verification: "biometric" for document + selfie, "document_only" for document-based only. Defaults to "biometric"'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL to receive webhook notification when verification completes'),
      referenceId: z
        .string()
        .optional()
        .describe('Your own reference ID to correlate this verification with your records')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('Unique ID of the created verification request'),
      status: z.string().describe('Current status of the verification'),
      email: z.string().describe('Email address the verification was sent to'),
      verificationType: z.string().describe('Type of verification requested'),
      verificationUrl: z
        .string()
        .optional()
        .describe('URL sent to the individual to complete verification'),
      createdAt: z.string().optional().describe('Timestamp when the verification was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.createVerification({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      verificationType: ctx.input.verificationType,
      callbackUrl: ctx.input.callbackUrl,
      referenceId: ctx.input.referenceId
    });

    return {
      output: {
        verificationId: result.id || result.verification_id,
        status: result.status || 'pending',
        email: result.email || ctx.input.email,
        verificationType:
          result.verification_type || ctx.input.verificationType || 'biometric',
        verificationUrl: result.verification_url || result.url,
        createdAt: result.created_at
      },
      message: `Identity verification request sent to **${ctx.input.email}**. Verification ID: \`${result.id || result.verification_id}\`. The individual will receive an email with a link to complete the ${ctx.input.verificationType || 'biometric'} verification.`
    };
  })
  .build();
