import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildRelationship,
  cleanAttributes,
  flattenResource,
  mergeRelationships,
  validateInput
} from '../lib/helpers';
import { spec } from '../spec';

export let createCall = SlateTool.create(spec, {
  name: 'Log Call',
  key: 'create_call',
  description: `Log a phone call in Outreach. Records call details including direction, outcome, purpose, timestamps and notes. This records an external call and does not dial a phone number.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      direction: z.enum(['inbound', 'outbound']).optional().describe('Call direction'),
      disposition: z
        .string()
        .optional()
        .describe(
          'Deprecated call attribute: do not supply. Use outcome and optionally callDispositionId.'
        ),
      outcome: z
        .enum(['Answered', 'Not Answered'])
        .optional()
        .describe(
          'External call outcome, required for logging. This logs a call; it does not dial.'
        ),
      note: z.string().optional().describe('Call notes'),
      dialedAt: z.string().optional().describe('When the call was dialed (ISO 8601)'),
      answeredAt: z.string().optional().describe('When the call was answered (ISO 8601)'),
      completedAt: z.string().optional().describe('When the call ended (ISO 8601)'),
      prospectId: z.string().optional().describe('Prospect ID the call was with'),
      userId: z.string().optional().describe('User ID who made/received the call'),
      sequenceId: z.string().optional().describe('Sequence ID if part of a sequence'),
      callDispositionId: z.string().optional().describe('Call disposition ID'),
      callPurposeId: z.string().optional().describe('Call purpose ID')
    })
  )
  .output(
    z.object({
      callId: z.string(),
      direction: z.string().optional(),
      disposition: z.string().optional(),
      outcome: z.string().optional(),
      dialedAt: z.string().optional(),
      answeredAt: z.string().optional(),
      completedAt: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    if (ctx.input.disposition !== undefined)
      throw createApiServiceError(
        'disposition is deprecated as a call attribute. Supply outcome and optionally callDispositionId.'
      );
    if (
      !ctx.input.direction ||
      !ctx.input.outcome ||
      !ctx.input.prospectId ||
      !ctx.input.userId
    )
      throw createApiServiceError(
        'direction, outcome, prospectId and userId are required to log an external call.'
      );
    let client = new Client({ token: ctx.auth.token });

    let attributes = cleanAttributes({
      direction: ctx.input.direction,
      outcome: ctx.input.outcome,
      note: ctx.input.note,
      dialedAt: ctx.input.dialedAt,
      answeredAt: ctx.input.answeredAt,
      completedAt: ctx.input.completedAt
    });

    let relationships = mergeRelationships(
      buildRelationship('prospect', ctx.input.prospectId),
      buildRelationship('user', ctx.input.userId),
      buildRelationship('sequence', ctx.input.sequenceId),
      buildRelationship('callDisposition', ctx.input.callDispositionId),
      buildRelationship('callPurpose', ctx.input.callPurposeId)
    );

    let resource = await client.createCall(attributes, relationships);
    let flat = flattenResource(resource);

    return {
      output: {
        callId: flat.id,
        direction: flat.direction,
        disposition: flat.disposition,
        outcome: flat.outcome,
        dialedAt: flat.dialedAt,
        answeredAt: flat.answeredAt,
        completedAt: flat.completedAt,
        createdAt: flat.createdAt
      },
      message: `Call logged with ID ${flat.id}. Direction: **${flat.direction ?? 'unknown'}**.`
    };
  })
  .build();
