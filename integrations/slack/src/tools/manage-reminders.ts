import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import {
  missingRequiredFieldError,
  slackServiceError,
  userTokenRequiredError
} from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

// Slack reminders.add accepts Unix timestamps, seconds-from-now, or natural
// language, but rejects ISO 8601 strings with `cannot_parse`; convert them here.
let DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/;
let DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
let ISO_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
let ISO_EXAMPLE = '2026-10-14T09:00:00+01:00';

let normalizeOffset = (offset: string | undefined) => {
  if (!offset || offset.toUpperCase() === 'Z') return 'Z';
  let [, hours, minutes] = /^([+-]\d{2}):?(\d{2})?$/.exec(offset) ?? [];
  return `${hours}:${minutes ?? '00'}`;
};

let normalizeReminderTime = (time: string): string | number => {
  let trimmed = time.trim();
  if (!DATE_PREFIX_PATTERN.test(trimmed)) return trimmed;

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    throw slackServiceError(
      `time "${time}" is missing a time of day; include a time and UTC offset, e.g. "${ISO_EXAMPLE}"`
    );
  }

  let invalid = () =>
    slackServiceError(
      `time "${time}" is not a valid ISO 8601 datetime; use a format like "${ISO_EXAMPLE}"`
    );

  let match = ISO_DATETIME_PATTERN.exec(trimmed);
  if (!match) throw invalid();

  let [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction, offset] =
    match;
  let year = Number(yearText);
  let month = Number(monthText);
  let day = Number(dayText);
  let hour = Number(hourText);
  let minute = Number(minuteText);
  let second = Number(secondText ?? '0');
  let daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw invalid();
  }

  let zone = normalizeOffset(offset);
  let timestampMs = Date.parse(
    `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText ?? '00'}${fraction ?? ''}${zone}`
  );
  if (Number.isNaN(timestampMs)) throw invalid();

  let timestamp = Math.floor(timestampMs / 1000);
  if (timestamp <= Math.floor(Date.now() / 1000)) {
    throw slackServiceError(`time "${time}" is in the past; provide a future time`);
  }

  return timestamp;
};

let reminderSchema = z.object({
  reminderId: z.string().describe('Reminder ID'),
  text: z.string().optional().describe('Reminder text'),
  userId: z.string().optional().describe('User the reminder is for'),
  time: z.number().optional().describe('Unix timestamp when the reminder triggers'),
  recurring: z.boolean().optional().describe('Whether the reminder is recurring'),
  completedAt: z.number().optional().describe('Unix timestamp when the reminder was completed')
});

export let manageReminders = SlateTool.create(spec, {
  name: 'Manage Reminders',
  key: 'manage_reminders',
  description: `Create, complete, delete, or list Slack reminders. Reminders notify a user at a specified time with a custom message.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.reminders)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      action: z
        .enum(['create', 'complete', 'delete', 'list'])
        .describe('Reminder action to perform'),
      reminderId: z.string().optional().describe('Reminder ID (for complete/delete actions)'),
      text: z.string().optional().describe('Reminder text (for create action)'),
      time: z
        .string()
        .optional()
        .describe(
          'When to trigger: Unix timestamp, natural language (e.g. "in 15 minutes", "every Thursday at 9am"), or ISO 8601 datetime with a time of day (e.g. "2026-10-14T09:00:00+01:00"; treated as UTC when no offset is given; date-only values are rejected)'
        ),
      userId: z
        .string()
        .optional()
        .describe('User to remind (defaults to the authenticated user)')
    })
  )
  .output(
    z.object({
      reminder: reminderSchema.optional().describe('Created/modified reminder'),
      reminders: z
        .array(reminderSchema)
        .optional()
        .describe('List of reminders (for list action)'),
      deleted: z.boolean().optional().describe('Whether the reminder was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let isUserToken =
      ctx.auth.actorType === 'user' || String(ctx.auth.token ?? '').startsWith('xoxp-');
    if (!isUserToken) {
      throw userTokenRequiredError(
        'Slack reminders require a user token. Use user_oauth or user_token.'
      );
    }

    let client = new SlackClient(ctx.auth.token);
    let { action } = ctx.input;

    let mapReminder = (r: any) => ({
      reminderId: r.id,
      text: r.text,
      userId: r.user,
      time: r.time,
      recurring: r.recurring,
      completedAt: r.complete_ts
    });

    if (action === 'create') {
      if (!ctx.input.text) throw missingRequiredFieldError('text', 'create action');
      if (!ctx.input.time) throw missingRequiredFieldError('time', 'create action');
      let reminder = await client.addReminder({
        text: ctx.input.text,
        time: normalizeReminderTime(ctx.input.time),
        user: ctx.input.userId
      });
      return {
        output: { reminder: mapReminder(reminder) },
        message: `Created reminder: "${ctx.input.text}".`
      };
    }

    if (action === 'complete') {
      if (!ctx.input.reminderId) {
        throw missingRequiredFieldError('reminderId', 'complete action');
      }
      await client.completeReminder(ctx.input.reminderId);
      return {
        output: { reminder: { reminderId: ctx.input.reminderId } },
        message: `Completed reminder \`${ctx.input.reminderId}\`.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.reminderId) {
        throw missingRequiredFieldError('reminderId', 'delete action');
      }
      await client.deleteReminder(ctx.input.reminderId);
      return {
        output: { deleted: true },
        message: `Deleted reminder \`${ctx.input.reminderId}\`.`
      };
    }

    let reminders = await client.listReminders();
    return {
      output: { reminders: reminders.map(mapReminder) },
      message: `Found ${reminders.length} reminder(s).`
    };
  })
  .build();
