import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { opsgenieServiceError } from '../lib/errors';
import { spec } from '../spec';

export let alertAction = SlateTool.create(spec, {
  name: 'Alert Action',
  key: 'alert_action',
  description: `Perform an action on an existing alert: close, acknowledge, unacknowledge, snooze, assign ownership, escalate, add a note, add/remove tags, add a responder, add/remove custom details, run a custom action, or delete. All mutating actions are processed asynchronously.`,
  instructions: [
    'Choose exactly one action to perform on the alert.',
    'For "snooze", provide snoozeEndTime as an ISO 8601 datetime.',
    'For "assign", provide ownerUsername or ownerId.',
    'For "escalate", provide escalationId or escalationName.',
    'For "add_note", provide note text.',
    'For "add_tags", provide an array of tags to add.',
    'For "remove_tags", provide an array of tags to remove.',
    'For "add_responder", provide responderType ("team" or "user") and responderId.',
    'For "add_details", provide details as key-value pairs; for "remove_details", provide detailKeys.',
    'For "execute_custom_action", provide customActionName matching one of the alert\'s actions.',
    'For "delete", use identifierType "id" or "tiny".',
    'Use get_alert_request_status with the returned requestId to confirm processing.'
  ]
})
  .input(
    z.object({
      alertIdentifier: z.string().describe('Alert ID, tiny ID, or alias'),
      identifierType: z
        .enum(['id', 'tiny', 'alias'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"'),
      action: z
        .enum([
          'close',
          'acknowledge',
          'unacknowledge',
          'snooze',
          'assign',
          'escalate',
          'add_note',
          'add_tags',
          'remove_tags',
          'delete',
          'add_responder',
          'add_details',
          'remove_details',
          'execute_custom_action'
        ])
        .describe('Action to perform on the alert'),
      note: z
        .string()
        .optional()
        .describe('Note to include with the action, or the note text for "add_note"'),
      user: z.string().optional().describe('Display name of the request owner'),
      source: z.string().optional().describe('Source of the action'),
      snoozeEndTime: z
        .string()
        .optional()
        .describe('End time for snooze in ISO 8601 format (required for "snooze" action)'),
      ownerUsername: z
        .string()
        .optional()
        .describe('Username to assign as owner (for "assign" action)'),
      ownerId: z
        .string()
        .optional()
        .describe('User ID to assign as owner (for "assign" action)'),
      escalationId: z.string().optional().describe('Escalation ID (for "escalate" action)'),
      escalationName: z
        .string()
        .optional()
        .describe('Escalation name (for "escalate" action)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to add or remove (for "add_tags" / "remove_tags" actions)'),
      responderType: z
        .enum(['team', 'user'])
        .optional()
        .describe('Responder type (for "add_responder" action)'),
      responderId: z
        .string()
        .optional()
        .describe('Team or user ID to add as responder (for "add_responder" action)'),
      details: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom properties to add (for "add_details" action)'),
      detailKeys: z
        .array(z.string())
        .optional()
        .describe('Custom property keys to remove (for "remove_details" action, max 10)'),
      customActionName: z
        .string()
        .optional()
        .describe('Name of the custom alert action to run (for "execute_custom_action")')
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

    let id = ctx.input.alertIdentifier;
    let idType = ctx.input.identifierType ?? 'id';
    let baseData = { user: ctx.input.user, source: ctx.input.source, note: ctx.input.note };
    let response: any;

    switch (ctx.input.action) {
      case 'close':
        response = await client.closeAlert(id, idType, baseData);
        break;
      case 'acknowledge':
        response = await client.acknowledgeAlert(id, idType, baseData);
        break;
      case 'unacknowledge':
        response = await client.unacknowledgeAlert(id, idType, baseData);
        break;
      case 'snooze':
        if (!ctx.input.snoozeEndTime) {
          throw opsgenieServiceError('snoozeEndTime is required for the snooze action.');
        }
        response = await client.snoozeAlert(id, idType, {
          endTime: ctx.input.snoozeEndTime,
          ...baseData
        });
        break;
      case 'assign':
        if (!ctx.input.ownerUsername && !ctx.input.ownerId) {
          throw opsgenieServiceError(
            'ownerUsername or ownerId is required for the assign action.'
          );
        }
        response = await client.assignAlert(id, idType, {
          owner: ctx.input.ownerId
            ? { id: ctx.input.ownerId }
            : { username: ctx.input.ownerUsername },
          ...baseData
        });
        break;
      case 'escalate':
        if (!ctx.input.escalationId && !ctx.input.escalationName) {
          throw opsgenieServiceError(
            'escalationId or escalationName is required for the escalate action.'
          );
        }
        response = await client.escalateAlert(id, idType, {
          escalation: ctx.input.escalationId
            ? { id: ctx.input.escalationId }
            : { name: ctx.input.escalationName },
          ...baseData
        });
        break;
      case 'add_note':
        if (!ctx.input.note) {
          throw opsgenieServiceError('note is required for the add_note action.');
        }
        response = await client.addNoteToAlert(id, idType, {
          note: ctx.input.note,
          user: ctx.input.user,
          source: ctx.input.source
        });
        break;
      case 'add_tags':
        if (!ctx.input.tags || ctx.input.tags.length === 0) {
          throw opsgenieServiceError('tags array is required for the add_tags action.');
        }
        response = await client.addTagsToAlert(id, idType, {
          tags: ctx.input.tags,
          ...baseData
        });
        break;
      case 'remove_tags':
        if (!ctx.input.tags || ctx.input.tags.length === 0) {
          throw opsgenieServiceError('tags array is required for the remove_tags action.');
        }
        response = await client.removeTagsFromAlert(id, idType, {
          tags: ctx.input.tags.join(','),
          user: ctx.input.user,
          source: ctx.input.source,
          note: ctx.input.note
        });
        break;
      case 'add_responder':
        if (!ctx.input.responderType || !ctx.input.responderId) {
          throw opsgenieServiceError(
            'responderType and responderId are required for the add_responder action.'
          );
        }
        response = await client.addResponderToAlert(id, idType, {
          responder: { type: ctx.input.responderType, id: ctx.input.responderId },
          ...baseData
        });
        break;
      case 'add_details':
        if (!ctx.input.details || Object.keys(ctx.input.details).length === 0) {
          throw opsgenieServiceError('details are required for the add_details action.');
        }
        response = await client.addDetailsToAlert(id, idType, {
          details: { ...ctx.input.details },
          ...baseData
        });
        break;
      case 'remove_details':
        if (!ctx.input.detailKeys || ctx.input.detailKeys.length === 0) {
          throw opsgenieServiceError('detailKeys are required for the remove_details action.');
        }
        response = await client.removeDetailsFromAlert(id, idType, {
          keys: ctx.input.detailKeys.join(','),
          ...baseData
        });
        break;
      case 'execute_custom_action':
        if (!ctx.input.customActionName) {
          throw opsgenieServiceError(
            'customActionName is required for the execute_custom_action action.'
          );
        }
        response = await client.executeAlertCustomAction(
          id,
          idType,
          ctx.input.customActionName,
          baseData
        );
        break;
      case 'delete':
        if (idType === 'alias') {
          throw opsgenieServiceError('Alert delete only supports id or tiny identifierType.');
        }
        response = await client.deleteAlert(id, idType, {
          user: ctx.input.user,
          source: ctx.input.source
        });
        break;
    }

    return {
      output: {
        requestId: response?.requestId ?? '',
        result: response?.result ?? 'Request will be processed'
      },
      message: `Performed **${ctx.input.action}** on alert \`${ctx.input.alertIdentifier}\``
    };
  })
  .build();
