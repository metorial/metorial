import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSequence = SlateTool.create(spec, {
  name: 'Manage Sequence',
  key: 'manage_sequence',
  description: `Create, update, delete, or control the state of an outreach sequence. Use this to create new sequences, update existing ones, or change a sequence's state (start, pause, archive, delete).`,
  instructions: [
    'To create a sequence, provide "name" and at least one "steps" entry. Omit settings for provider defaults, or supply the full settings object. The "sequenceId" is not needed for creation.',
    'To update, provide "sequenceId" and any fields to change.',
    'To change state, set "action" to "start", "pause", "archive", or "delete" along with "sequenceId".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'start', 'pause', 'archive', 'delete'])
        .describe('Action to perform on the sequence'),
      sequenceId: z
        .number()
        .optional()
        .describe('ID of the sequence (required for update/start/pause/archive/delete)'),
      name: z.string().optional().describe('Sequence name (required for create)'),
      scheduleId: z.number().optional().describe('Schedule ID to associate with the sequence'),
      emailAccounts: z.array(z.number()).optional().describe('Email account IDs to use'),
      steps: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Required for create: at least one documented sequence step. Creation does not start a sequence.'
        ),
      settings: z
        .object({
          emailsCountPerDay: z.number().optional(),
          daysToFinishProspect: z.number().optional(),
          emailSendingDelaySeconds: z.number().optional(),
          dailyThrottling: z.number().optional(),
          disableOpensTracking: z.boolean().optional(),
          repliesHandlingType: z.enum(['MarkAsFinished', 'ContinueSending']).optional(),
          enableLinksTracking: z.boolean().optional()
        })
        .optional()
        .describe('Sequence settings')
    })
  )
  .output(
    z.object({
      sequence: z
        .record(z.string(), z.any())
        .optional()
        .describe('Created or updated sequence details'),
      deleted: z.boolean().optional().describe('Whether the sequence was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action, sequenceId, name, scheduleId, emailAccounts, settings, steps } = ctx.input;

    if (action === 'create') {
      let data: Record<string, unknown> = { name, steps };
      if (settings !== undefined) data.settings = settings;
      if (scheduleId !== undefined) data.scheduleId = scheduleId;
      if (emailAccounts) data.emailAccounts = emailAccounts;

      let sequence = await client.createSequence(data);
      return {
        output: { sequence },
        message: `Created sequence **${sequence.name ?? name}** (ID: ${sequence.id}).`
      };
    }

    if (!sequenceId) {
      throw createApiServiceError('sequenceId is required for this action');
    }

    if (action === 'update') {
      let data: Record<string, any> = {};
      if (name !== undefined) data.name = name;
      if (scheduleId !== undefined) data.scheduleId = scheduleId;
      if (emailAccounts) data.emailAccounts = emailAccounts;
      if (settings) data.settings = settings;

      let sequence = await client.updateSequence(sequenceId, data);
      return {
        output: { sequence },
        message: `Updated sequence **${sequence.name ?? sequenceId}**.`
      };
    }

    if (action === 'start') {
      let sequence = await client.startSequence(sequenceId);
      return {
        output: { sequence },
        message: `Started sequence **${sequenceId}**.`
      };
    }

    if (action === 'pause') {
      let sequence = await client.pauseSequence(sequenceId);
      return {
        output: { sequence },
        message: `Paused sequence **${sequenceId}**.`
      };
    }

    if (action === 'archive') {
      let sequence = await client.archiveSequence(sequenceId);
      return {
        output: { sequence },
        message: `Archived sequence **${sequenceId}**.`
      };
    }

    // delete
    await client.deleteSequence(sequenceId);
    return {
      output: { deleted: true },
      message: `Deleted sequence **${sequenceId}**.`
    };
  })
  .build();
