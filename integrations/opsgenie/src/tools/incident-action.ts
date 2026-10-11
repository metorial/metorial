import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { opsgenieServiceError } from '../lib/errors';
import { spec } from '../spec';

export let incidentAction = SlateTool.create(spec, {
  name: 'Incident Action',
  key: 'incident_action',
  description: `Perform an action on an existing incident: close, resolve, reopen, delete, add a note, add a responder, add/remove tags, or change priority. All actions are processed asynchronously. Only available on Standard and Enterprise plans.`,
  instructions: [
    'Use "resolve" to mark an incident as resolved, "close" to close it, and "reopen" to reopen a resolved or closed incident.',
    'For "add_note", provide note text.',
    'For "add_responder", provide responderType plus responderId, or responderName (team) / responderUsername (user).',
    'For "add_tags" / "remove_tags", provide tags.',
    'For "update_priority", provide priority.',
    'Use get_incident_request_status with the returned requestId to confirm processing.'
  ]
})
  .input(
    z.object({
      incidentIdentifier: z.string().describe('Incident ID or tiny ID'),
      identifierType: z
        .enum(['id', 'tiny'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"'),
      action: z
        .enum([
          'close',
          'resolve',
          'delete',
          'add_note',
          'reopen',
          'add_responder',
          'add_tags',
          'remove_tags',
          'update_priority'
        ])
        .describe('Action to perform on the incident'),
      note: z.string().optional().describe('Note to include with the action'),
      responderType: z
        .enum(['team', 'user'])
        .optional()
        .describe('Responder type (for "add_responder")'),
      responderId: z.string().optional().describe('Team or user ID (for "add_responder")'),
      responderName: z
        .string()
        .optional()
        .describe('Team name (for "add_responder" with a team responder)'),
      responderUsername: z
        .string()
        .optional()
        .describe('Username/email (for "add_responder" with a user responder)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to add or remove (for "add_tags" / "remove_tags")'),
      priority: z
        .enum(['P1', 'P2', 'P3', 'P4', 'P5'])
        .optional()
        .describe('New priority (for "update_priority")')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the async processing status'),
      result: z.string().describe('Result message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let id = ctx.input.incidentIdentifier;
    let idType = ctx.input.identifierType ?? 'id';
    let response: any;

    switch (ctx.input.action) {
      case 'close':
        response = await client.closeIncident(id, idType, { note: ctx.input.note });
        break;
      case 'resolve':
        response = await client.resolveIncident(id, idType, { note: ctx.input.note });
        break;
      case 'reopen':
        response = await client.reopenIncident(id, idType, { note: ctx.input.note });
        break;
      case 'delete':
        response = await client.deleteIncident(id, idType);
        break;
      case 'add_note':
        if (!ctx.input.note) {
          throw opsgenieServiceError('note is required for the add_note action.');
        }
        response = await client.addNoteToIncident(id, idType, { note: ctx.input.note });
        break;
      case 'add_responder': {
        if (!ctx.input.responderType) {
          throw opsgenieServiceError(
            'responderType is required for the add_responder action.'
          );
        }
        let responder: { type: string; id?: string; name?: string; username?: string };
        if (ctx.input.responderId) {
          responder = { type: ctx.input.responderType, id: ctx.input.responderId };
        } else if (ctx.input.responderType === 'team' && ctx.input.responderName) {
          responder = { type: 'team', name: ctx.input.responderName };
        } else if (ctx.input.responderType === 'user' && ctx.input.responderUsername) {
          responder = { type: 'user', username: ctx.input.responderUsername };
        } else {
          throw opsgenieServiceError(
            'add_responder requires responderId, or responderName for a team / responderUsername for a user.'
          );
        }
        response = await client.addResponderToIncident(id, idType, {
          responder: [responder],
          note: ctx.input.note
        });
        break;
      }
      case 'add_tags':
        if (!ctx.input.tags || ctx.input.tags.length === 0) {
          throw opsgenieServiceError('tags array is required for the add_tags action.');
        }
        response = await client.addTagsToIncident(id, idType, {
          tags: ctx.input.tags,
          note: ctx.input.note
        });
        break;
      case 'remove_tags':
        if (!ctx.input.tags || ctx.input.tags.length === 0) {
          throw opsgenieServiceError('tags array is required for the remove_tags action.');
        }
        response = await client.removeTagsFromIncident(id, idType, {
          tags: ctx.input.tags.join(','),
          note: ctx.input.note
        });
        break;
      case 'update_priority':
        if (!ctx.input.priority) {
          throw opsgenieServiceError('priority is required for the update_priority action.');
        }
        response = await client.updateIncidentPriority(id, idType, {
          priority: ctx.input.priority
        });
        break;
    }

    return {
      output: {
        requestId: response?.requestId ?? '',
        result: response?.result ?? 'Request will be processed'
      },
      message: `Performed **${ctx.input.action}** on incident \`${ctx.input.incidentIdentifier}\``
    };
  })
  .build();
