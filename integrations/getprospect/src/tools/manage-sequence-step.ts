import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSequenceStep = SlateTool.create(spec, {
  name: 'Create Sequence Step',
  key: 'create_sequence_step',
  description: `Add a new step to an email outreach sequence. Steps define individual emails in the sequence with subject, body, and delay configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sequenceId: z.string().describe('ID of the sequence to add the step to'),
      subject: z.string().optional().describe('Email subject line'),
      body: z.string().optional().describe('Email body content'),
      delayDays: z
        .number()
        .optional()
        .describe('Number of days to wait before sending this step')
    })
  )
  .output(
    z.object({
      stepId: z.string().optional().describe('ID of the newly created step'),
      sequenceId: z.string().optional().describe('ID of the parent sequence'),
      subject: z.string().optional().describe('Email subject')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createStep({
      sequenceId: ctx.input.sequenceId,
      subject: ctx.input.subject,
      body: ctx.input.body,
      delayDays: ctx.input.delayDays
    });

    return {
      output: {
        stepId: result.id ?? result.step_id,
        sequenceId: result.sequence_id ?? ctx.input.sequenceId,
        subject: result.subject ?? ctx.input.subject
      },
      message: `Created step in sequence **${ctx.input.sequenceId}**${ctx.input.subject ? ` with subject "${ctx.input.subject}"` : ''}.`
    };
  })
  .build();

export let updateSequenceStep = SlateTool.create(spec, {
  name: 'Update Sequence Step',
  key: 'update_sequence_step',
  description: `Update an existing step in an email outreach sequence. Modify the subject, body, or delay between steps.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      stepId: z.string().describe('ID of the step to update'),
      subject: z.string().optional().describe('New email subject line'),
      body: z.string().optional().describe('New email body content'),
      delayDays: z.number().optional().describe('New delay in days before sending')
    })
  )
  .output(
    z.object({
      stepId: z.string().optional().describe('ID of the updated step'),
      subject: z.string().optional().describe('Updated email subject')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateStep(ctx.input.stepId, {
      subject: ctx.input.subject,
      body: ctx.input.body,
      delayDays: ctx.input.delayDays
    });

    return {
      output: {
        stepId: result.id ?? result.step_id ?? ctx.input.stepId,
        subject: result.subject
      },
      message: `Updated step **${ctx.input.stepId}**.`
    };
  })
  .build();

export let deleteSequenceStep = SlateTool.create(spec, {
  name: 'Delete Sequence Step',
  key: 'delete_sequence_step',
  description: `Permanently delete a step from an email outreach sequence. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      stepId: z.string().describe('ID of the step to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteStep(ctx.input.stepId);

    return {
      output: { success: true },
      message: `Deleted step **${ctx.input.stepId}**.`
    };
  })
  .build();
