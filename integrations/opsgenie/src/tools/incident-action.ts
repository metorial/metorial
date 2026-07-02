import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { opsgenieServiceError } from '../lib/errors';
import { spec } from '../spec';

export let incidentAction = SlateTool.create(spec, {
  name: 'Incident Action',
  key: 'incident_action',
  description: `Perform an action on an existing incident: close, resolve, delete, or add a note. Only available on Standard and Enterprise plans.`,
  instructions: [
    'Use "resolve" to mark an incident as resolved.',
    'Use "close" to close an incident.',
    'For "add_note", provide note text.'
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
        .enum(['close', 'resolve', 'delete', 'add_note'])
        .describe('Action to perform on the incident'),
      note: z.string().optional().describe('Note to include with the action')
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
      case 'delete':
        response = await client.deleteIncident(id, idType);
        break;
      case 'add_note':
        if (!ctx.input.note) {
          throw opsgenieServiceError('note is required for the add_note action.');
        }
        response = await client.addNoteToIncident(id, idType, { note: ctx.input.note });
        break;
    }

    return {
      output: {
        requestId: response.requestId ?? '',
        result: response.result ?? 'Request will be processed'
      },
      message: `Performed **${ctx.input.action}** on incident \`${ctx.input.incidentIdentifier}\``
    };
  })
  .build();
