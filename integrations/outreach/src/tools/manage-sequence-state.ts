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

export let manageSequenceState = SlateTool.create(spec, {
  name: 'Manage Sequence Enrollment',
  key: 'manage_sequence_state',
  description: `Add a prospect to a sequence, or update/manage their enrollment state.
A sequence state represents a prospect's position and status within a sequence.
Creating enrollment starts automation immediately. Update pauses, resumes or finishes enrollment through its supported lifecycle actions.`,
  instructions: [
    'To add a prospect to a sequence, use action "create" and provide prospectId, sequenceId and mailboxId. Automation starts immediately; confirm the recipient, mailbox and sequence effects before creating enrollment.',
    'To pause or resume, use action "update" and set the state field accordingly.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      sequenceStateId: z
        .string()
        .optional()
        .describe('Sequence state ID (required for update)'),
      prospectId: z.string().optional().describe('Prospect ID (required for create)'),
      sequenceId: z.string().optional().describe('Sequence ID (required for create)'),
      mailboxId: z.string().optional().describe('Mailbox ID to send from'),
      state: z
        .enum(['active', 'paused', 'finished', 'disabled'])
        .optional()
        .describe(
          'Update requests active (resume), paused (pause) or finished (finish). Deprecated disabled is provider-managed and cannot be requested. Create accepts only active or omission.'
        )
    })
  )
  .output(
    z.object({
      sequenceStateId: z.string(),
      state: z.string().optional(),
      prospectId: z.string().optional(),
      sequenceId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (ctx.input.state !== undefined && ctx.input.state !== 'active')
        throw createApiServiceError(
          'Enrollment begins automation immediately; create cannot request a paused, finished or disabled initial state.'
        );
      if (!ctx.input.mailboxId)
        throw createApiServiceError('mailboxId is required for enrollment.');
      if (!ctx.input.prospectId || !ctx.input.sequenceId) {
        throw createApiServiceError('prospectId and sequenceId are required for create');
      }

      let relationships =
        mergeRelationships(
          buildRelationship('prospect', ctx.input.prospectId),
          buildRelationship('sequence', ctx.input.sequenceId),
          buildRelationship('mailbox', ctx.input.mailboxId)
        ) ?? {};

      const steps = await client.listSequenceSteps({
        'filter[sequence][id]': ctx.input.sequenceId,
        'page[limit]': '1'
      });
      if (!steps.records.length)
        throw createApiServiceError(
          'The sequence has no steps. Configure the intended sequence before starting enrollment.'
        );
      let resource = await client.createSequenceState({}, relationships);
      let flat = flattenResource(resource);
      return {
        output: {
          sequenceStateId: flat.id,
          state: flat.state,
          prospectId: flat.prospectId,
          sequenceId: flat.sequenceId,
          createdAt: flat.createdAt,
          updatedAt: flat.updatedAt
        },
        message: `Prospect enrolled in sequence. Sequence state ID: ${flat.id}, state: ${flat.state ?? 'not returned'}.`
      };
    }

    if (!ctx.input.sequenceStateId)
      throw createApiServiceError('sequenceStateId is required for update');
    if (
      ctx.input.prospectId !== undefined ||
      ctx.input.sequenceId !== undefined ||
      ctx.input.mailboxId !== undefined
    )
      throw createApiServiceError(
        'Enrollment relationships cannot be changed. Use these fields only when creating enrollment.'
      );
    let attributes = cleanAttributes({
      state: ctx.input.state
    });

    let resource = await client.updateSequenceState(ctx.input.sequenceStateId, attributes);
    let flat = flattenResource(resource);
    return {
      output: {
        sequenceStateId: flat.id,
        state: flat.state,
        prospectId: flat.prospectId,
        sequenceId: flat.sequenceId,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt
      },
      message: `Sequence state **${flat.id}** updated to **${flat.state ?? 'not returned'}**.`
    };
  })
  .build();
