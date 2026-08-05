import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const ACTIVITY_MODEL = 'mail.activity';
const MAX_ATTACHMENT_IDS = 100;
const MAX_CONTEXT_DEPTH = 20;
const PREFLIGHT_FIELDS = [
  'id',
  'active',
  'summary',
  'activity_type_id',
  'user_id',
  'res_model',
  'res_id',
  'date_deadline'
];
const READBACK_FIELDS = ['id', 'active', 'state', 'date_done', 'feedback', 'attachment_ids'];

type JsonRecord = Record<string, unknown>;
type ActionResultKind = 'message_posted' | 'no_message' | 'other';

interface NormalizedValue {
  ok: true;
  value: unknown;
}

interface InvalidValue {
  ok: false;
}

type NormalizationResult = NormalizedValue | InvalidValue;

interface ActivityDetails {
  summary: string | null;
  activityTypeId: number | null;
  activityTypeName: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  relatedModel: string | null;
  relatedRecordId: number | null;
  deadline: string;
}

interface CompletionVerification {
  retention: 'archived' | 'removed';
  dateDone: string | null;
  feedback: string | null;
  feedbackRecorded: boolean;
  attachmentIds: number[];
  attachmentsRecorded: boolean;
}

let jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string().min(1), jsonValueSchema)
  ])
);

let invalidInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isPlainRecord = (value: object): value is JsonRecord => {
  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

let normalizeJsonValue = (
  value: unknown,
  depth: number,
  ancestors: Set<object>
): NormalizationResult => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return { ok: true, value };
  }
  if (typeof value !== 'object' || depth >= MAX_CONTEXT_DEPTH || ancestors.has(value)) {
    return { ok: false };
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    let keys = Reflect.ownKeys(value);
    if (
      keys.length !== value.length + 1 ||
      !keys.includes('length') ||
      !keys.every(
        key =>
          key === 'length' ||
          (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length)
      )
    ) {
      ancestors.delete(value);
      return { ok: false };
    }

    let normalized: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      let descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
        ancestors.delete(value);
        return { ok: false };
      }
      let item = normalizeJsonValue(descriptor.value, depth + 1, ancestors);
      if (!item.ok) {
        ancestors.delete(value);
        return item;
      }
      normalized.push(item.value);
    }
    ancestors.delete(value);
    return { ok: true, value: normalized };
  }

  if (!isPlainRecord(value)) {
    ancestors.delete(value);
    return { ok: false };
  }

  let normalizedKeys = new Set<string>();
  let normalizedEntries: [string, unknown][] = [];
  for (let key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      ancestors.delete(value);
      return { ok: false };
    }
    let descriptor = Object.getOwnPropertyDescriptor(value, key);
    let normalizedKey = key.trim();
    if (
      normalizedKey === '' ||
      normalizedKeys.has(normalizedKey) ||
      !descriptor?.enumerable ||
      !Object.hasOwn(descriptor, 'value')
    ) {
      ancestors.delete(value);
      return { ok: false };
    }
    let item = normalizeJsonValue(descriptor.value, depth + 1, ancestors);
    if (!item.ok) {
      ancestors.delete(value);
      return item;
    }
    normalizedKeys.add(normalizedKey);
    normalizedEntries.push([normalizedKey, item.value]);
  }
  ancestors.delete(value);
  return { ok: true, value: Object.fromEntries(normalizedEntries) };
};

let normalizeActivityId = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw invalidInput(
      'Activity ID must be a positive integer.',
      'odoo_complete_activity_id_invalid'
    );
  }
  return value;
};

let normalizeFeedback = (value: unknown) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidInput(
      'Activity feedback must contain non-whitespace text when provided.',
      'odoo_complete_activity_feedback_invalid'
    );
  }
  return value.trim();
};

let normalizeAttachmentIds = (value: unknown) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw invalidInput(
      'Odoo attachment IDs must be provided as an array.',
      'odoo_complete_activity_attachment_ids_invalid'
    );
  }
  if (value.length === 0) {
    throw invalidInput(
      'Odoo attachment IDs must not be empty when provided.',
      'odoo_complete_activity_attachment_ids_empty'
    );
  }
  if (value.length > MAX_ATTACHMENT_IDS) {
    throw invalidInput(
      `Complete an activity with at most ${MAX_ATTACHMENT_IDS} Odoo attachments.`,
      'odoo_complete_activity_attachment_ids_too_many'
    );
  }
  if (!value.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
    throw invalidInput(
      'Every Odoo attachment ID must be a positive integer.',
      'odoo_complete_activity_attachment_id_invalid'
    );
  }
  if (new Set(value).size !== value.length) {
    throw invalidInput(
      'Odoo attachment IDs must be unique.',
      'odoo_complete_activity_attachment_ids_duplicate'
    );
  }
  return value as number[];
};

let normalizeContext = (value: unknown): JsonRecord | undefined => {
  if (value === undefined) return undefined;

  let normalized: NormalizationResult;
  try {
    normalized =
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      isPlainRecord(value)
        ? normalizeJsonValue(value, 0, new Set())
        : { ok: false };
  } catch {
    normalized = { ok: false };
  }
  if (!normalized.ok || typeof normalized.value !== 'object' || normalized.value === null) {
    throw invalidInput(
      `Odoo context must be a plain JSON object with non-empty keys, finite values, and at most ${MAX_CONTEXT_DEPTH} levels of nesting.`,
      'odoo_complete_activity_context_invalid'
    );
  }
  return normalized.value as JsonRecord;
};

let requireOneRecord = (
  value: unknown,
  activityId: number,
  phase: 'preflight' | 'readback'
): JsonRecord => {
  if (Array.isArray(value) && value.length === 0 && phase === 'preflight') {
    throw createApiServiceError(
      `Odoo activity #${activityId} was not found or is not readable by the connected user. Verify the ID and the user's Activities and related-record access.`,
      { reason: 'odoo_complete_activity_not_found_or_inaccessible' }
    );
  }
  if (!Array.isArray(value) || value.length !== 1 || !isPlainRecord(value[0])) {
    throw createApiServiceError(
      `Odoo did not return exactly one activity while ${phase === 'preflight' ? 'checking it' : 'verifying its completion'}.`,
      { reason: 'odoo_complete_activity_readback_invalid' }
    );
  }
  if (value[0].id !== activityId) {
    throw createApiServiceError('Odoo returned a different activity than the one requested.', {
      reason: 'odoo_complete_activity_readback_invalid'
    });
  }
  return value[0];
};

let optionalText = (value: unknown, field: string) => {
  if (value === false || value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw createApiServiceError(`Odoo returned an invalid ${field}.`, {
      reason: 'odoo_complete_activity_readback_invalid'
    });
  }
  return value;
};

let requireText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(`Odoo returned an invalid ${field}.`, {
      reason: 'odoo_complete_activity_readback_invalid'
    });
  }
  return value;
};

let optionalRelationship = (
  value: unknown,
  field: string
): { id: number | null; name: string | null } => {
  if (value === false || value === null || value === undefined) {
    return { id: null, name: null };
  }
  let id = typeof value === 'number' ? value : Array.isArray(value) ? value[0] : undefined;
  let name = Array.isArray(value) && typeof value[1] === 'string' ? value[1] : null;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw createApiServiceError(`Odoo returned an invalid ${field}.`, {
      reason: 'odoo_complete_activity_readback_invalid'
    });
  }
  return { id, name };
};

let requirePreflight = (value: unknown, activityId: number): ActivityDetails => {
  let record = requireOneRecord(value, activityId, 'preflight');
  if (typeof record.active !== 'boolean') {
    throw createApiServiceError('Odoo returned an invalid activity active state.', {
      reason: 'odoo_complete_activity_readback_invalid'
    });
  }
  if (!record.active) {
    throw createApiServiceError(
      `Odoo activity #${activityId} is already completed and archived. Choose an active activity.`,
      { reason: 'odoo_complete_activity_already_completed' }
    );
  }

  let activityType = optionalRelationship(record.activity_type_id, 'activity type');
  let assignee = optionalRelationship(record.user_id, 'activity assignee');
  let relatedRecordId = record.res_id;
  if (
    relatedRecordId !== false &&
    relatedRecordId !== null &&
    relatedRecordId !== undefined &&
    (typeof relatedRecordId !== 'number' ||
      !Number.isInteger(relatedRecordId) ||
      relatedRecordId <= 0)
  ) {
    throw createApiServiceError('Odoo returned an invalid related record ID.', {
      reason: 'odoo_complete_activity_readback_invalid'
    });
  }

  return {
    summary: optionalText(record.summary, 'activity summary'),
    activityTypeId: activityType.id,
    activityTypeName: activityType.name,
    assigneeId: assignee.id,
    assigneeName: assignee.name,
    relatedModel: optionalText(record.res_model, 'related model'),
    relatedRecordId: typeof relatedRecordId === 'number' ? relatedRecordId : null,
    deadline: requireText(record.date_deadline, 'activity deadline')
  };
};

let requireAttachmentIds = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    !value.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)
  ) {
    throw createApiServiceError('Odoo returned invalid activity attachment IDs.', {
      reason: 'odoo_complete_activity_readback_invalid'
    });
  }
  return value as number[];
};

let verifyCompletion = (
  value: unknown,
  activityId: number,
  requestedFeedback: string | undefined,
  requestedAttachmentIds: number[] | undefined
): CompletionVerification => {
  if (Array.isArray(value) && value.length === 0) {
    return {
      retention: 'removed',
      dateDone: null,
      feedback: null,
      feedbackRecorded: false,
      attachmentIds: [],
      attachmentsRecorded: false
    };
  }

  let record = requireOneRecord(value, activityId, 'readback');
  if (record.active !== false || record.state !== 'done') {
    throw createApiServiceError(
      `Odoo did not complete activity #${activityId}; its verified state is not inactive and done. Refresh the activity and verify the connected user's access before retrying.`,
      { reason: 'odoo_complete_activity_transition_not_applied' }
    );
  }

  let dateDone = requireText(record.date_done, 'activity completion date');
  let feedback = optionalText(record.feedback, 'activity feedback');
  let attachmentIds = requireAttachmentIds(record.attachment_ids);
  if (requestedFeedback !== undefined && feedback !== requestedFeedback) {
    throw createApiServiceError(
      `Odoo completed activity #${activityId}, but did not preserve the requested feedback. Review the completed activity before retrying.`,
      { reason: 'odoo_complete_activity_feedback_not_recorded' }
    );
  }
  if (
    requestedAttachmentIds !== undefined &&
    !requestedAttachmentIds.every(id => attachmentIds.includes(id))
  ) {
    throw createApiServiceError(
      `Odoo completed activity #${activityId}, but did not preserve every requested attachment. Review the completed activity before retrying.`,
      { reason: 'odoo_complete_activity_attachments_not_recorded' }
    );
  }

  return {
    retention: 'archived',
    dateDone,
    feedback,
    feedbackRecorded: requestedFeedback !== undefined,
    attachmentIds,
    attachmentsRecorded: requestedAttachmentIds !== undefined
  };
};

let normalizeActionResult = (
  value: unknown
): { actionResult: ActionResultKind; messageId: number | null } => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return { actionResult: 'message_posted', messageId: value };
  }
  if (value === false || value === null || value === undefined) {
    return { actionResult: 'no_message', messageId: null };
  }
  return { actionResult: 'other', messageId: null };
};

let readArguments = (fields: string[], context: JsonRecord | undefined) => {
  let verificationContext = { ...(context ?? {}), active_test: false };
  return { fields, load: null, context: verificationContext };
};

export let completeActivity = SlateTool.create(spec, {
  name: 'Complete Activity',
  key: 'complete_activity',
  description:
    'Complete one active Odoo activity, optionally record feedback and attach existing Odoo files, and return verified completion, ownership, related-record, feedback, attachment, and message metadata.',
  instructions: [
    'Use the exact positive mail.activity record ID of an active activity.',
    'Without feedback or attachment IDs, the tool uses Odoo’s standard completion action. When either is provided, it uses Odoo’s feedback-aware completion action.',
    'Odoo normally archives completed activities and records a completion date. It may remove an activity instead when its related record no longer exists.',
    'The tool reads the activity before and after completion, and does not treat an already completed, missing, or inaccessible activity as a new successful completion.'
  ],
  constraints: [
    'Requires the Odoo Activities feature and permission to read and complete the target activity.',
    'Feedback is recorded in Odoo and attachment IDs must identify existing Odoo ir.attachment records the connected user can use.',
    'Completing an activity can post on the related record, trigger a configured next activity, and run other Odoo automation.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      activityId: z
        .number()
        .int()
        .positive()
        .describe('Positive Odoo mail.activity record ID to complete'),
      feedback: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Optional non-empty feedback to record on the completed activity'),
      attachmentIds: z
        .array(z.number().int().positive())
        .min(1)
        .max(MAX_ATTACHMENT_IDS)
        .refine(ids => new Set(ids).size === ids.length, 'Attachment IDs must be unique')
        .optional()
        .describe('Optional unique positive Odoo ir.attachment IDs to add to the completion'),
      context: z
        .record(z.string().min(1), jsonValueSchema)
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      activityId: z.number().int().positive().describe('Completed Odoo activity ID'),
      summary: z.string().nullable().describe('Activity summary when it was set'),
      activityTypeId: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe('Activity type ID when it was set'),
      activityTypeName: z.string().nullable().describe('Activity type display name'),
      assigneeId: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe('Assigned Odoo user ID when set'),
      assigneeName: z.string().nullable().describe('Assigned user display name'),
      relatedModel: z.string().nullable().describe('Technical related-record model'),
      relatedRecordId: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe('Related Odoo record ID when set'),
      deadline: z.string().min(1).describe('Activity deadline before completion'),
      status: z.literal('completed').describe('Verified completion status'),
      retention: z
        .enum(['archived', 'removed'])
        .describe(
          'Whether Odoo retained the inactive activity or removed an orphaned activity'
        ),
      dateDone: z
        .string()
        .min(1)
        .nullable()
        .describe('Verified Odoo completion date, or null when the activity was removed'),
      feedback: z.string().nullable().describe('Feedback stored on the completed activity'),
      feedbackRecorded: z
        .boolean()
        .describe('Whether the requested feedback was verified on the archived activity'),
      attachmentIds: z
        .array(z.number().int().positive())
        .describe('Odoo attachment IDs retained on the archived activity'),
      attachmentsRecorded: z
        .boolean()
        .describe('Whether every requested attachment was verified on the archived activity'),
      actionResult: z
        .enum(['message_posted', 'no_message', 'other'])
        .describe('Normalized metadata from Odoo’s completion result'),
      messageId: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe('Posted Odoo mail.message ID when returned by the completion action')
    })
  )
  .handleInvocation(async ctx => {
    let activityId = normalizeActivityId(ctx.input.activityId);
    let feedback = normalizeFeedback(ctx.input.feedback);
    let attachmentIds = normalizeAttachmentIds(ctx.input.attachmentIds);
    let context = normalizeContext(ctx.input.context);

    try {
      let client = createClient(ctx);
      let preflightArguments = readArguments(PREFLIGHT_FIELDS, context);
      let preflight = await client.callRecordMethod({
        model: ACTIVITY_MODEL,
        method: 'read',
        ids: [activityId],
        arguments: preflightArguments,
        legacyKeywordArguments: preflightArguments
      });
      let activity = requirePreflight(preflight, activityId);

      let usesFeedbackAction = feedback !== undefined || attachmentIds !== undefined;
      let actionArguments = usesFeedbackAction
        ? {
            ...(feedback === undefined ? {} : { feedback }),
            ...(attachmentIds === undefined ? {} : { attachment_ids: attachmentIds }),
            ...(context === undefined ? {} : { context })
          }
        : context === undefined
          ? undefined
          : { context };
      let rawActionResult = await client.callRecordMethod({
        model: ACTIVITY_MODEL,
        method: usesFeedbackAction ? 'action_feedback' : 'action_done',
        ids: [activityId],
        arguments: actionArguments,
        legacyKeywordArguments: actionArguments
      });

      let postReadArguments = readArguments(READBACK_FIELDS, context);
      let readback = await client.callRecordMethod({
        model: ACTIVITY_MODEL,
        method: 'read',
        ids: [activityId],
        arguments: postReadArguments,
        legacyKeywordArguments: postReadArguments
      });
      let completion = verifyCompletion(readback, activityId, feedback, attachmentIds);
      let actionMetadata = normalizeActionResult(rawActionResult);
      let output = {
        activityId,
        ...activity,
        status: 'completed' as const,
        ...completion,
        ...actionMetadata
      };

      return {
        output,
        message:
          completion.retention === 'archived'
            ? `Completed and archived Odoo activity **${activity.summary ?? `#${activityId}`}** (#${activityId}).`
            : `Completed Odoo activity **${activity.summary ?? `#${activityId}`}** (#${activityId}); Odoo removed it because its related record was unavailable.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `completing activity #${activityId}`,
        reason: 'odoo_complete_activity_failed'
      });
    }
  })
  .build();
