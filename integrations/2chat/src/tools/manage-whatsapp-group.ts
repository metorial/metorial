import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let manageWhatsAppGroup = SlateTool.create(spec, {
  name: 'Manage WhatsApp Group',
  key: 'manage_whatsapp_group',
  description: `Create a WhatsApp group or manage group membership and settings. Supports creating groups, adding/removing participants, promoting/demoting admins, and updating group descriptions.`,
  instructions: [
    'Use action "create" to create a new group with initial participants.',
    'Use action "add_participant" or "remove_participant" to manage membership.',
    'Use action "promote" or "demote" to change admin privileges.',
    'Use action "set_description" to update the group description.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'add_participant',
          'remove_participant',
          'promote',
          'demote',
          'set_description'
        ])
        .describe('Action to perform on the group'),
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      groupUuid: z
        .string()
        .optional()
        .describe('UUID of the group (required for all actions except "create")'),
      groupName: z
        .string()
        .optional()
        .describe('Name for the new group (required for "create")'),
      participants: z
        .array(z.string())
        .optional()
        .describe('Phone numbers of initial participants (for "create")'),
      participantNumber: z
        .string()
        .optional()
        .describe('Phone number of the participant to add/remove/promote/demote'),
      description: z
        .string()
        .optional()
        .describe('New group description (for "set_description")')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe(
          'Whether the request and every requested participant operation completed successfully'
        ),
      groupUuid: z.string().optional().describe('UUID of the group'),
      groupName: z.string().optional().describe('Name of the group'),
      acceptedNumbers: z
        .array(z.string())
        .optional()
        .describe(
          'Numbers whose participant operation succeeded without requiring an invitation'
        ),
      rejectedNumbers: z
        .array(z.string())
        .optional()
        .describe('Numbers whose participant operation was rejected by 2Chat'),
      invitedNumbers: z
        .array(z.string())
        .optional()
        .describe('Numbers sent an invitation; their membership is not confirmed'),
      participantResults: z
        .array(
          z.object({
            phoneNumber: z.string().describe('Phone number associated with this result'),
            statusCode: z
              .number()
              .optional()
              .describe('Participant-specific status code returned by 2Chat'),
            providerMessage: z
              .string()
              .optional()
              .describe('Participant-specific response message'),
            inviteSent: z
              .boolean()
              .optional()
              .describe('Whether an invitation was sent instead of confirming membership'),
            isGroupCreator: z
              .boolean()
              .optional()
              .describe('Whether this participant created the group')
          })
        )
        .optional()
        .describe('Participant-specific provider outcomes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });
    let {
      action,
      fromNumber,
      groupUuid,
      groupName,
      participants,
      participantNumber,
      description
    } = ctx.input;

    if (action === 'create') {
      if (!groupName?.trim() || !participants?.length)
        throw createApiServiceError('Creating a group requires groupName and participants.', {
          reason: 'missing_group_fields'
        });
      if (participants.length > 10 || participants.some(number => !number.trim()))
        throw createApiServiceError(
          'Provide 1 to 10 participant numbers when creating a group.',
          { reason: 'invalid_group_participants' }
        );
    } else {
      if (!groupUuid?.trim())
        throw createApiServiceError('Provide groupUuid from List WhatsApp Groups.', {
          reason: 'missing_group_uuid'
        });
      if (
        action === 'set_description' ? description === undefined : !participantNumber?.trim()
      )
        throw createApiServiceError(
          action === 'set_description'
            ? 'Provide description; use an empty string to clear it.'
            : 'Provide participantNumber for this action.',
          { reason: 'missing_group_action_field' }
        );
    }

    let result: any;
    let message: string;

    switch (action) {
      case 'create': {
        result = await client.createGroup({
          fromNumber,
          groupName: groupName || 'New Group',
          participants: participants || [],
          description
        });
        message = `Group creation request returned for **${groupName}**.`;
        break;
      }
      case 'add_participant': {
        result = await client.addGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Added **${participantNumber}** to the group.`;
        break;
      }
      case 'remove_participant': {
        result = await client.removeGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Removed **${participantNumber}** from the group.`;
        break;
      }
      case 'promote': {
        result = await client.promoteGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Promoted **${participantNumber}** to admin.`;
        break;
      }
      case 'demote': {
        result = await client.demoteGroupParticipant({
          fromNumber,
          groupUuid: groupUuid!,
          phoneNumber: participantNumber!
        });
        message = `Demoted **${participantNumber}** from admin.`;
        break;
      }
      case 'set_description': {
        result = await client.setGroupDescription({
          fromNumber,
          groupUuid: groupUuid!,
          description: description || ''
        });
        message = `Updated group description.`;
        break;
      }
    }

    let acceptedNumbers: string[] = [];
    let rejectedNumbers: string[] = [];
    let invitedNumbers: string[] = [];
    let participantResults:
      | {
          phoneNumber: string;
          statusCode?: number;
          providerMessage?: string;
          inviteSent?: boolean;
          isGroupCreator?: boolean;
        }[]
      | undefined;
    let success = result?.success === true;

    if (action !== 'set_description') {
      let outcome = action === 'create' ? result?.group : result?.participants;
      let perNumber = action === 'create' ? outcome?.participants : outcome;
      let requestedNumbers = action === 'create' ? participants! : [participantNumber!];
      acceptedNumbers = Array.isArray(outcome?.accepted_numbers)
        ? outcome.accepted_numbers.filter(
            (number: unknown): number is string => typeof number === 'string'
          )
        : [];
      rejectedNumbers = Array.isArray(outcome?.unaccepted_numbers)
        ? outcome.unaccepted_numbers.filter(
            (number: unknown): number is string => typeof number === 'string'
          )
        : [];
      invitedNumbers = [];
      participantResults = [];
      let entries = isApiErrorRecord(perNumber) ? Object.entries(perNumber) : [];
      if (
        action !== 'create' &&
        isApiErrorRecord(perNumber) &&
        typeof perNumber.statusCode === 'number'
      ) {
        entries = [[participantNumber!, perNumber]];
      }
      for (let [phoneNumber, detail] of entries) {
        if (!isApiErrorRecord(detail)) continue;
        let statusCode = typeof detail.statusCode === 'number' ? detail.statusCode : undefined;
        let inviteSent =
          typeof detail.isInviteV4Sent === 'boolean' ? detail.isInviteV4Sent : undefined;
        let providerMessage = typeof detail.message === 'string' ? detail.message : undefined;
        let isGroupCreator =
          typeof detail.isGroupCreator === 'boolean' ? detail.isGroupCreator : undefined;
        if (statusCode === undefined && inviteSent === undefined) continue;
        participantResults.push({
          phoneNumber,
          statusCode,
          providerMessage,
          inviteSent,
          isGroupCreator
        });
        if (statusCode !== undefined && (statusCode < 200 || statusCode >= 300)) {
          rejectedNumbers.push(phoneNumber);
        } else if (inviteSent === true) {
          invitedNumbers.push(phoneNumber);
        } else if (statusCode !== undefined) {
          acceptedNumbers.push(phoneNumber);
        }
      }
      let numberKey = (number: string) => number.replace(/[^0-9]/g, '');
      requestedNumbers = [
        ...new Map(requestedNumbers.map(number => [numberKey(number), number])).values()
      ];
      rejectedNumbers = [...new Set(rejectedNumbers)];
      invitedNumbers = [...new Set(invitedNumbers)];
      let rejectedKeys = new Set(rejectedNumbers.map(numberKey));
      let invitedKeys = new Set(invitedNumbers.map(numberKey));
      acceptedNumbers = [...new Set(acceptedNumbers)].filter(
        number => !rejectedKeys.has(numberKey(number)) && !invitedKeys.has(numberKey(number))
      );
      let acceptedKeys = new Set(acceptedNumbers.map(numberKey));
      let confirmedCount = requestedNumbers.filter(number =>
        acceptedKeys.has(numberKey(number))
      ).length;
      let rejectedCount = requestedNumbers.filter(number =>
        rejectedKeys.has(numberKey(number))
      ).length;
      let invitedCount = requestedNumbers.filter(
        number => invitedKeys.has(numberKey(number)) && !rejectedKeys.has(numberKey(number))
      ).length;
      let unconfirmedCount =
        requestedNumbers.length - confirmedCount - rejectedCount - invitedCount;
      success =
        success &&
        confirmedCount === requestedNumbers.length &&
        rejectedNumbers.length === 0 &&
        invitedNumbers.length === 0;
      if (action === 'create') {
        message = `Group creation ${result?.success === true ? 'request accepted' : 'not confirmed'} for **${result?.group?.name ?? groupName}**. Requested participant outcomes: ${confirmedCount} confirmed, ${rejectedCount} rejected, ${invitedCount} invited, ${unconfirmedCount} unconfirmed.`;
      } else if (!success) {
        message =
          invitedCount > 0
            ? `An invitation was sent to **${participantNumber}**; group membership is not confirmed.`
            : rejectedCount > 0
              ? `2Chat rejected the **${action}** operation for **${participantNumber}**. Review rejectedNumbers and any provider details in participantResults before retrying.`
              : `2Chat accepted the **${action}** request for **${participantNumber}** but did not confirm the participant outcome.`;
      }
    } else if (!success) {
      message = '2Chat did not confirm the group description update.';
    }

    return {
      output: {
        success,
        groupUuid: result?.group?.uuid ?? result?.uuid ?? result?.group_uuid ?? groupUuid,
        groupName: result?.group?.name ?? result?.group_name ?? result?.name ?? groupName,
        acceptedNumbers: action === 'set_description' ? undefined : acceptedNumbers,
        rejectedNumbers: action === 'set_description' ? undefined : rejectedNumbers,
        invitedNumbers: action === 'set_description' ? undefined : invitedNumbers,
        participantResults
      },
      message
    };
  })
  .build();
