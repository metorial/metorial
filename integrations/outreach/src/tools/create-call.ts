import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildRelationship,
  cleanAttributes,
  flattenResource,
  mergeRelationships
} from '../lib/helpers';
import { spec } from '../spec';

export let createCall = SlateTool.create(spec, {
  name: 'Log Call',
  key: 'create_call',
  description: `Log a phone call in Outreach. Records call details including direction, outcome (disposition), purpose, duration, and notes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      direction: z.enum(['inbound', 'outbound']).optional().describe('Call direction'),
      disposition: z.string().optional().describe('Call outcome/disposition'),
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
      dialedAt: z.string().optional(),
      answeredAt: z.string().optional(),
      completedAt: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let attributes = cleanAttributes({
      direction: ctx.input.direction,
      disposition: ctx.input.disposition,
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
        dialedAt: flat.dialedAt,
        answeredAt: flat.answeredAt,
        completedAt: flat.completedAt,
        createdAt: flat.createdAt
      },
      message: `Call logged with ID ${flat.id}. Direction: **${flat.direction ?? 'unknown'}**.`
    };
  })
  .build();
