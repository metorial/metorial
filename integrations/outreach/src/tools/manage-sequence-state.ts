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

export let manageSequenceState = SlateTool.create(spec, {
  name: 'Manage Sequence Enrollment',
  key: 'manage_sequence_state',
  description: `Add a prospect to a sequence, or update/manage their enrollment state.
A sequence state represents a prospect's position and status within a sequence.
Use the **create** action to enroll a prospect in a sequence, or **update** to pause/resume enrollment.`,
  instructions: [
    'To add a prospect to a sequence, use action "create" and provide both prospectId and sequenceId.',
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
        .describe('Enrollment state')
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
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.prospectId || !ctx.input.sequenceId) {
        throw new Error('prospectId and sequenceId are required for create');
      }

      let relationships =
        mergeRelationships(
          buildRelationship('prospect', ctx.input.prospectId),
          buildRelationship('sequence', ctx.input.sequenceId),
          buildRelationship('mailbox', ctx.input.mailboxId)
        ) ?? {};

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
        message: `Prospect enrolled in sequence. Sequence state ID: ${flat.id}, state: ${flat.state}.`
      };
    }

    if (!ctx.input.sequenceStateId) throw new Error('sequenceStateId is required for update');
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
      message: `Sequence state **${flat.id}** updated to **${flat.state}**.`
    };
  })
  .build();
