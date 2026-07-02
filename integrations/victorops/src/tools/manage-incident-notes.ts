import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageIncidentNotes = SlateTool.create(spec, {
  name: 'Manage Incident Notes',
  key: 'manage_incident_notes',
  description: `Create, update, delete, or list notes on a specific incident. Notes provide a way to annotate incidents with additional context during and after incident response.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Action to perform on notes'),
      incidentNumber: z.string().describe('Incident number to manage notes for'),
      noteName: z
        .string()
        .optional()
        .describe('Name/ID of the note (required for update and delete)'),
      content: z
        .string()
        .optional()
        .describe('Content of the note (required for create and update)')
    })
  )
  .output(
    z.object({
      notes: z.array(z.any()).optional().describe('List of notes (for list action)'),
      note: z.any().optional().describe('Created or updated note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.getIncidentNotes(ctx.input.incidentNumber);
        let notes = data?.notes ?? [];
        return {
          output: { notes },
          message: `Found **${notes.length}** note(s) on incident #${ctx.input.incidentNumber}.`
        };
      }

      case 'create': {
        let note = await client.createIncidentNote(ctx.input.incidentNumber, {
          content: ctx.input.content ?? ''
        });
        return {
          output: { note },
          message: `Created note on incident **#${ctx.input.incidentNumber}**.`
        };
      }

      case 'update': {
        let note = await client.updateIncidentNote(
          ctx.input.incidentNumber,
          ctx.input.noteName ?? '',
          { content: ctx.input.content ?? '' }
        );
        return {
          output: { note },
          message: `Updated note **${ctx.input.noteName}** on incident **#${ctx.input.incidentNumber}**.`
        };
      }

      case 'delete': {
        await client.deleteIncidentNote(ctx.input.incidentNumber, ctx.input.noteName ?? '');
        return {
          output: {},
          message: `Deleted note **${ctx.input.noteName}** from incident **#${ctx.input.incidentNumber}**.`
        };
      }
    }
  })
  .build();
