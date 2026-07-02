import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { adobeSignServiceError } from '../lib/errors';
import { spec } from '../spec';

let collectParticipantIds = (members: any) => {
  let sets = [...(members.nextParticipantSets || []), ...(members.participantSets || [])];
  let ids: string[] = [];

  for (let set of sets) {
    for (let member of set.memberInfos || []) {
      if (typeof member.id === 'string' && !ids.includes(member.id)) {
        ids.push(member.id);
      }
    }
  }

  return ids;
};

export let sendReminder = SlateTool.create(spec, {
  name: 'Send Reminder',
  key: 'send_reminder',
  description: `Send a reminder to participants who have not yet completed their actions on an agreement. Reminders can be sent once or configured with a recurring frequency.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement to send reminders for'),
      comment: z.string().optional().describe('Custom message to include in the reminder'),
      frequency: z
        .enum([
          'ONCE',
          'DAILY_UNTIL_SIGNED',
          'WEEKDAILY_UNTIL_SIGNED',
          'EVERY_OTHER_DAY_UNTIL_SIGNED',
          'EVERY_THIRD_DAY_UNTIL_SIGNED',
          'EVERY_FIFTH_DAY_UNTIL_SIGNED',
          'WEEKLY_UNTIL_SIGNED'
        ])
        .optional()
        .describe('Frequency of the reminder. Defaults to "ONCE".'),
      recipientParticipantIds: z
        .array(z.string())
        .optional()
        .describe(
          'Specific participant IDs to send reminders to. If omitted, the tool uses the agreement member list to target pending participants.'
        ),
      firstReminderDelay: z
        .number()
        .optional()
        .describe('Hours to wait before sending the first reminder')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the agreement'),
      reminderId: z.string().optional().describe('ID of the created reminder, if returned'),
      recipientParticipantIds: z
        .array(z.string())
        .describe('Participant IDs targeted by the reminder'),
      status: z.string().describe('Requested reminder status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let recipientParticipantIds = ctx.input.recipientParticipantIds;
    if (!recipientParticipantIds || recipientParticipantIds.length === 0) {
      let members = await client.getAgreementMembers(ctx.input.agreementId);
      recipientParticipantIds = collectParticipantIds(members);
    }

    if (recipientParticipantIds.length === 0) {
      throw adobeSignServiceError(
        'No participant IDs were available for this reminder. Provide recipientParticipantIds explicitly.'
      );
    }

    let result = await client.createReminder({
      agreementId: ctx.input.agreementId,
      comment: ctx.input.comment,
      frequency: ctx.input.frequency,
      recipientParticipantIds,
      firstReminderDelay: ctx.input.firstReminderDelay
    });

    return {
      output: {
        agreementId: ctx.input.agreementId,
        reminderId: result?.reminderId || result?.id,
        recipientParticipantIds,
        status: result?.status || 'ACTIVE'
      },
      message: `Reminder sent for agreement \`${ctx.input.agreementId}\` with frequency **${ctx.input.frequency || 'ONCE'}**.`
    };
  });
