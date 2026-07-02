import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClassParticipants = SlateTool.create(spec, {
  name: 'Manage Class Participants',
  key: 'manage_class_participants',
  description: `Add, cancel, or list participants for a group class. Participants can be added with BOOKED or WAITLISTED status.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'cancel', 'list']).describe('Action to perform'),
      classId: z.string().describe('Class ID'),
      clientId: z.string().optional().describe('Client ID (required for add and cancel)'),
      status: z
        .enum(['BOOKED', 'WAITLISTED'])
        .optional()
        .describe('Participant status (for add, defaults to BOOKED)'),
      reason: z.string().optional().describe('Cancellation reason (for cancel)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      participants: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of participants (for list action)'),
      participant: z
        .record(z.string(), z.any())
        .optional()
        .describe('Added participant record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action, classId } = ctx.input;

    if (action === 'add') {
      if (!ctx.input.clientId) throw new Error('clientId is required for add');
      let result = await client.addClassParticipant(classId, {
        clientId: ctx.input.clientId,
        status: ctx.input.status
      });
      return {
        output: { success: true, participant: result },
        message: `Added client **${ctx.input.clientId}** to class **${classId}** as ${ctx.input.status || 'BOOKED'}.`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.clientId) throw new Error('clientId is required for cancel');
      await client.cancelClassParticipant(classId, {
        clientId: ctx.input.clientId,
        reason: ctx.input.reason
      });
      return {
        output: { success: true },
        message: `Cancelled client **${ctx.input.clientId}** from class **${classId}**.`
      };
    }

    if (action === 'list') {
      let result = await client.getClassParticipants(classId);
      let participants = Array.isArray(result)
        ? result
        : result.participants || result.data || [];
      return {
        output: { success: true, participants },
        message: `Found **${participants.length}** participant(s) in class ${classId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
