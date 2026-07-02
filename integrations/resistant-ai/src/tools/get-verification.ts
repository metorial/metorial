import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let getVerification = SlateTool.create(spec, {
  name: 'Get Verification',
  key: 'get_verification',
  description: `Retrieves the details and current status of an identity verification request. Returns the verification outcome (positive or negative), document details, and any associated report links. Use this to check whether a previously requested verification has been completed and its result.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      verificationId: z.string().describe('ID of the verification to retrieve')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('Unique ID of the verification'),
      status: z
        .string()
        .describe(
          'Current status of the verification (e.g., pending, completed, expired, cancelled)'
        ),
      outcome: z
        .string()
        .optional()
        .describe('Verification outcome: "positive" or "negative"'),
      email: z.string().optional().describe('Email address of the verified individual'),
      firstName: z
        .string()
        .optional()
        .describe('First name extracted from the identity document'),
      lastName: z
        .string()
        .optional()
        .describe('Last name extracted from the identity document'),
      dateOfBirth: z
        .string()
        .optional()
        .describe('Date of birth extracted from the identity document'),
      documentType: z
        .string()
        .optional()
        .describe('Type of identity document used (e.g., passport, drivers_licence)'),
      documentCountry: z.string().optional().describe('Country of the identity document'),
      verificationType: z.string().optional().describe('Type of verification performed'),
      reportUrl: z
        .string()
        .optional()
        .describe('URL to the detailed verification report (PDF)'),
      certificateUrl: z
        .string()
        .optional()
        .describe('URL to the Identity Certificate if verification was positive'),
      referenceId: z
        .string()
        .optional()
        .describe('Your reference ID if provided during creation'),
      completedAt: z.string().optional().describe('Timestamp when verification was completed'),
      createdAt: z.string().optional().describe('Timestamp when verification was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.getVerification(ctx.input.verificationId);

    return {
      output: {
        verificationId: result.id || result.verification_id,
        status: result.status,
        outcome: result.outcome || result.result,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        dateOfBirth: result.date_of_birth,
        documentType: result.document_type,
        documentCountry: result.document_country,
        verificationType: result.verification_type,
        reportUrl: result.report_url,
        certificateUrl: result.certificate_url,
        referenceId: result.reference_id,
        completedAt: result.completed_at,
        createdAt: result.created_at
      },
      message: `Verification \`${ctx.input.verificationId}\`: **${result.status}**${result.outcome ? ` — outcome: **${result.outcome}**` : ''}${result.email ? ` for ${result.email}` : ''}.`
    };
  })
  .build();
