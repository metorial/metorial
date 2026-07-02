import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotServiceError } from '../lib/errors';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let resolveSequenceUserId = (inputUserId?: string, authUserId?: string) => {
  let userId = inputUserId?.trim() || authUserId?.trim();
  if (!userId) {
    throw hubSpotServiceError(
      'HubSpot userId is required. Provide userId or authenticate with OAuth so HubSpot returns a userId.'
    );
  }

  return userId;
};

let sequenceSummaryOutputSchema = z.object({
  sequenceId: z.string().describe('HubSpot sequence ID'),
  name: z.string().optional().describe('Sequence name'),
  folderId: z.string().optional().describe('HubSpot folder ID containing the sequence'),
  userId: z.string().optional().describe('HubSpot user ID that owns the sequence'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let sequenceDetailOutputSchema = sequenceSummaryOutputSchema.extend({
  steps: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('Sequence steps, including task or email patterns when returned by HubSpot'),
  settings: z
    .record(z.string(), z.any())
    .optional()
    .describe('Sequence settings such as follow-up days and send window'),
  dependencies: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('Dependencies between sequence steps')
});

let sequenceEnrollmentOutputSchema = z.object({
  enrollmentId: z.string().describe('HubSpot sequence enrollment ID'),
  contactId: z.string().optional().describe('HubSpot contact ID'),
  sequenceId: z.string().optional().describe('HubSpot sequence ID'),
  sequenceName: z.string().optional().describe('Sequence name'),
  senderEmail: z.string().optional().describe('Email address used to send sequence messages'),
  toEmail: z.string().optional().describe('Email address enrolled in the sequence'),
  enrolledBy: z.string().optional().describe('HubSpot user ID that enrolled the contact'),
  enrolledByEmail: z
    .string()
    .optional()
    .describe('Email address for the user who enrolled the contact'),
  enrolledAt: z.string().optional().describe('Enrollment timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapSequenceSummary = (result: any) => ({
  sequenceId: String(result.id),
  name: result.name,
  folderId: result.folderId == null ? undefined : String(result.folderId),
  userId: result.userId == null ? undefined : String(result.userId),
  createdAt: result.createdAt,
  updatedAt: result.updatedAt
});

let mapSequenceDetail = (result: any) => ({
  ...mapSequenceSummary(result),
  steps: result.steps,
  settings: result.settings,
  dependencies: result.dependencies
});

let mapEnrollment = (
  result: any,
  input?: {
    contactId?: string;
    sequenceId?: string;
    senderEmail?: string;
  }
) => ({
  enrollmentId: String(result.id),
  contactId: input?.contactId,
  sequenceId:
    input?.sequenceId ?? (result.sequenceId == null ? undefined : String(result.sequenceId)),
  sequenceName: result.sequenceName,
  senderEmail: input?.senderEmail,
  toEmail: result.toEmail,
  enrolledBy: result.enrolledBy == null ? undefined : String(result.enrolledBy),
  enrolledByEmail: result.enrolledByEmail,
  enrolledAt: result.enrolledAt,
  updatedAt: result.updatedAt
});

export let listSequences = SlateTool.create(spec, {
  name: 'List Sequences',
  key: 'list_sequences',
  description:
    'List HubSpot sales or service sequences for a HubSpot user. Requires a Sales Hub or Service Hub Professional or Enterprise seat.',
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listSequences)
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'HubSpot user ID. Defaults to the authenticated OAuth user ID when available; private app tokens must provide this.'
        ),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of sequences to return (max 100)'),
      after: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .output(
    z.object({
      sequences: z.array(sequenceSummaryOutputSchema).describe('List of sequences'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let userId = resolveSequenceUserId(ctx.input.userId, ctx.auth.userId);
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listSequences(userId, ctx.input.limit || 10, ctx.input.after);
    let sequences = (result.results || []).map(mapSequenceSummary);

    return {
      output: {
        sequences,
        hasMore: !!result.paging?.next?.after,
        nextCursor: result.paging?.next?.after,
        total: result.total
      },
      message: `Retrieved **${sequences.length}** sequences${result.paging?.next?.after ? ' (more available)' : ''}`
    };
  })
  .build();

export let getSequence = SlateTool.create(spec, {
  name: 'Get Sequence',
  key: 'get_sequence',
  description:
    'Retrieve details for a specific HubSpot sales or service sequence, including steps, settings, and dependencies.',
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getSequence)
  .input(
    z.object({
      sequenceId: z.string().describe('HubSpot sequence ID'),
      userId: z
        .string()
        .optional()
        .describe(
          'HubSpot user ID. Defaults to the authenticated OAuth user ID when available; private app tokens must provide this.'
        )
    })
  )
  .output(sequenceDetailOutputSchema)
  .handleInvocation(async ctx => {
    let userId = resolveSequenceUserId(ctx.input.userId, ctx.auth.userId);
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getSequence(ctx.input.sequenceId, userId);
    let sequence = mapSequenceDetail(result);

    return {
      output: sequence,
      message: `Retrieved sequence **${sequence.name || sequence.sequenceId}** (ID: ${sequence.sequenceId})`
    };
  })
  .build();

export let enrollContactInSequence = SlateTool.create(spec, {
  name: 'Enroll Contact In Sequence',
  key: 'enroll_contact_in_sequence',
  description:
    'Enroll a HubSpot contact in a sales or service sequence using a connected sender email address.',
  constraints: [
    'The senderEmail must be connected to the HubSpot account.',
    'HubSpot limits sequence enrollments to 1000 enrollments per portal inbox per day.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.enrollContactInSequence)
  .input(
    z.object({
      sequenceId: z.string().describe('HubSpot sequence ID'),
      contactId: z.string().describe('HubSpot contact ID to enroll'),
      senderEmail: z
        .string()
        .email()
        .describe('Connected HubSpot sender email address for sequence messages'),
      userId: z
        .string()
        .optional()
        .describe(
          'HubSpot user ID. Defaults to the authenticated OAuth user ID when available; private app tokens must provide this.'
        )
    })
  )
  .output(sequenceEnrollmentOutputSchema)
  .handleInvocation(async ctx => {
    let userId = resolveSequenceUserId(ctx.input.userId, ctx.auth.userId);
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.enrollContactInSequence(userId, {
      sequenceId: ctx.input.sequenceId,
      contactId: ctx.input.contactId,
      senderEmail: ctx.input.senderEmail
    });
    let enrollment = mapEnrollment(result, ctx.input);

    return {
      output: enrollment,
      message: `Enrolled contact ${ctx.input.contactId} in sequence ${ctx.input.sequenceId}`
    };
  })
  .build();

export let getSequenceEnrollmentStatus = SlateTool.create(spec, {
  name: 'Get Sequence Enrollment Status',
  key: 'get_sequence_enrollment_status',
  description:
    'Check whether a HubSpot contact is currently enrolled in a sales or service sequence.',
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getSequenceEnrollmentStatus)
  .input(
    z.object({
      contactId: z.string().describe('HubSpot contact ID')
    })
  )
  .output(
    z.object({
      enrolled: z.boolean().describe('Whether the contact is currently enrolled'),
      enrollment: sequenceEnrollmentOutputSchema
        .optional()
        .describe('Current sequence enrollment details when the contact is enrolled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getSequenceEnrollmentStatus(ctx.input.contactId);

    if (!result) {
      return {
        output: {
          enrolled: false
        },
        message: `Contact ${ctx.input.contactId} is not currently enrolled in a sequence`
      };
    }

    let enrollment = mapEnrollment(result, { contactId: ctx.input.contactId });

    let sequenceLabel = enrollment.sequenceName || enrollment.sequenceId || '';

    return {
      output: {
        enrolled: true,
        enrollment
      },
      message: `Contact ${ctx.input.contactId} is enrolled in sequence ${sequenceLabel}`.trim()
    };
  })
  .build();
