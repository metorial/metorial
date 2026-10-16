import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireWholeNumber } from '../lib/client';
import { providerRecordSchema } from '../lib/schemas';
import { spec } from '../spec';

let operationShape = {
  action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
  id: z
    .number()
    .optional()
    .describe('Required for update/delete. Call get_event_content to discover the resource ID')
};
let name = z.string().min(1).optional();
let timestamp = z
  .string()
  .optional()
  .describe('YYYY-MM-DD HH:mm:ss in the event time zone; required for create/update');
let agendaOutput = z.object({
  result: providerRecordSchema
    .nullable()
    .describe('Complete provider resource, or null after a successful deletion')
});

type AgendaInput = { action: 'create' | 'update' | 'delete'; id?: number } & Record<
  string,
  unknown
>;
type Resource = 'hall' | 'lecture' | 'pause' | 'speaker' | 'label';

let changeAgenda = async (token: string, resource: Resource, input: AgendaInput) => {
  let { action, id, ...fields } = input;
  let data = pickDefined(fields);
  if (action === 'create' && id !== undefined) {
    throw createApiServiceError('Omit id when creating a new resource.');
  }
  if (action !== 'create') requireWholeNumber(id, 'id');
  if (action === 'delete' && Object.keys(data).length) {
    throw createApiServiceError('For delete, provide only action and id.');
  }
  if (action !== 'delete') {
    let required = resource === 'speaker' && action === 'update' ? [] : ['name'];
    if (resource === 'lecture' || resource === 'pause') required.push('start', 'end');
    if (resource === 'label') required.push('color');
    for (let field of required) {
      if (typeof data[field] !== 'string' || !data[field].trim()) {
        throw createApiServiceError(`${field} is required for ${action} ${resource}.`);
      }
    }
    for (let field of ['order', 'capacity', 'hall_id']) {
      if (data[field] !== undefined) {
        requireWholeNumber(data[field], field, field === 'hall_id' ? 1 : 0);
      }
    }
    for (let field of ['speakers', 'tracks']) {
      let ids = data[field];
      if (Array.isArray(ids)) for (let value of ids) requireWholeNumber(value, field);
    }
    if (resource === 'lecture') {
      if (data.type !== undefined && data.type !== 0 && data.type !== 1) {
        throw createApiServiceError('type must be 0 (lecture) or 1 (workshop).');
      }
      if (action === 'update' && data.checkin !== undefined) {
        throw createApiServiceError('checkin is supported only when creating a workshop.');
      }
      if (data.checkin === true && data.type !== 1) {
        throw createApiServiceError('Set type to 1 when enabling workshop checkin.');
      }
      if (typeof data.capacity === 'number' && data.capacity > 0 && data.type !== 1) {
        throw createApiServiceError('Set type to 1 when supplying workshop capacity.');
      }
    }
    if (data.start !== undefined || data.end !== undefined) {
      for (let field of ['start', 'end']) {
        let value = data[field];
        if (
          typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
        ) {
          throw createApiServiceError(
            `${field} must use YYYY-MM-DD HH:mm:ss in the event time zone.`
          );
        }
        let parsed = new Date(`${value.replace(' ', 'T')}Z`);
        if (
          Number.isNaN(parsed.getTime()) ||
          parsed.toISOString().slice(0, 19).replace('T', ' ') !== value
        ) {
          throw createApiServiceError(`${field} must be a valid date and time.`);
        }
      }
      if (String(data.start) >= String(data.end)) {
        throw createApiServiceError('end must be after start.');
      }
    }
    if (resource === 'speaker' && action === 'update' && !Object.keys(data).length) {
      throw createApiServiceError('Provide at least one speaker field to update.');
    }
  }
  let client = new Client({ token });
  let path = `/${resource}${action === 'create' ? '' : `/${id}`}`;
  let result = await client.request(
    action === 'create' ? 'POST' : action === 'update' ? 'PATCH' : 'DELETE',
    path,
    action === 'delete' ? undefined : data
  );
  if (action === 'delete')
    return { output: { result: null }, message: 'Deleted the agenda resource.' };
  let parsed = providerRecordSchema.safeParse(result);
  if (!parsed.success)
    throw createApiServiceError('Eventee returned an unexpected resource response.');
  return {
    output: { result: parsed.data },
    message: `${action === 'create' ? 'Created' : 'Updated'} the agenda resource.`
  };
};

export let manageHall = SlateTool.create(spec, {
  name: 'Manage Hall',
  key: 'manage_hall',
  description:
    'Create, update, or delete an event hall or stage. Call get_event_content to discover hall IDs. Update requires name; omitting stream on update removes the hall stream. Deleting a hall keeps its sessions without a hall.',
  tags: { destructive: true }
})
  .input(
    z.object({
      ...operationShape,
      name,
      order: z
        .number()
        .optional()
        .describe('Non-negative whole display order; omitted values are kept on update'),
      stream: z
        .string()
        .optional()
        .describe(
          'Existing stream code from a session; omitted on update removes the hall stream'
        )
    })
  )
  .output(agendaOutput)
  .handleInvocation(ctx => changeAgenda(ctx.auth.token, 'hall', ctx.input))
  .build();

export let manageSession = SlateTool.create(spec, {
  name: 'Manage Session',
  key: 'manage_session',
  description:
    'Create, replace, or delete a lecture or workshop. Call get_event_content to discover sessions, halls, speakers and labels. Create/update require name, start and end. Update resets omitted speakers, tracks, type, capacity and engagement flags; send their current values to retain them. Deletion removes questions, polls, bookings and ratings.',
  instructions: [
    'For update, start must fall on an existing event day. Read get_event_content before replacing a session.',
    'Eventee preserves hall and stream on update when omitted. Workshops use type 1.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      ...operationShape,
      name,
      description: z.string().optional(),
      start: timestamp,
      end: timestamp,
      type: z
        .number()
        .optional()
        .describe('0 = lecture, 1 = workshop. Omitted update resets to lecture'),
      hall_id: z
        .number()
        .optional()
        .describe('Hall ID from get_event_content; preserved on update if omitted'),
      speakers: z
        .array(z.number())
        .optional()
        .describe(
          'Speaker IDs from get_event_content, in display order. Omitted update removes all speakers'
        ),
      tracks: z
        .array(z.number())
        .optional()
        .describe('Label IDs from get_event_content. Omitted update removes all labels'),
      discussion: z.boolean().optional().describe('Enable questions; defaults to false'),
      moderating: z
        .boolean()
        .optional()
        .describe('Require question moderation; defaults to false'),
      polling: z.boolean().optional().describe('Enable polls; defaults to false'),
      checkin: z
        .boolean()
        .optional()
        .describe('Workshop check-in; create only, requires type 1'),
      capacity: z
        .number()
        .optional()
        .describe(
          'Non-negative whole workshop capacity; requires type 1 for positive values; omitted update resets to 0'
        ),
      stream: z
        .string()
        .optional()
        .describe('Live stream URL; omitted update retains the current stream'),
      virtual_meeting: z.string().optional().describe('Virtual meeting URL')
    })
  )
  .output(agendaOutput)
  .handleInvocation(ctx => changeAgenda(ctx.auth.token, 'lecture', ctx.input))
  .build();

export let manageBreak = SlateTool.create(spec, {
  name: 'Manage Break',
  key: 'manage_break',
  description:
    'Create, update, or delete an agenda break. Call get_event_content to discover break IDs in raw.pauses. Create/update require name, start and end; omitted description is preserved on update.',
  tags: { destructive: true }
})
  .input(
    z.object({
      ...operationShape,
      name: z.string().min(1).max(128).optional(),
      description: z.string().optional(),
      start: timestamp,
      end: timestamp
    })
  )
  .output(agendaOutput)
  .handleInvocation(ctx => changeAgenda(ctx.auth.token, 'pause', ctx.input))
  .build();

export let manageSpeaker = SlateTool.create(spec, {
  name: 'Manage Speaker',
  key: 'manage_speaker',
  description:
    'Create, partially update, or delete a speaker. Call get_event_content to discover speaker IDs and full names in raw.speakers. Create requires name; update keeps omitted fields. Deletion removes the speaker from all sessions.',
  tags: { destructive: true }
})
  .input(
    z.object({
      ...operationShape,
      name: z.string().min(1).max(256).optional(),
      email: z.string().max(255).optional(),
      photo: z.string().optional(),
      bio: z.string().optional(),
      position: z.string().max(128).optional(),
      company: z.string().max(128).optional(),
      phone: z.string().max(32).optional(),
      web: z.string().max(512).optional(),
      linkedIn: z.string().max(512).optional(),
      twitter: z.string().max(512).optional(),
      facebook: z.string().max(512).optional(),
      instagram: z.string().max(512).optional(),
      country: z.string().length(2).optional().describe('Two-letter country code'),
      language: z.string().max(24).optional()
    })
  )
  .output(agendaOutput)
  .handleInvocation(ctx => changeAgenda(ctx.auth.token, 'speaker', ctx.input))
  .build();

export let manageLabel = SlateTool.create(spec, {
  name: 'Manage Label',
  key: 'manage_label',
  description:
    'Create, update, or delete an agenda label (track). Call get_event_content to discover label IDs. Create/update require name and color. Deletion removes the label from all sessions. Enable Tracks in the event settings to display labels.',
  tags: { destructive: true }
})
  .input(
    z.object({
      ...operationShape,
      name: z.string().min(1).max(191).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Six-digit hex color; required for create/update'),
      order: z
        .number()
        .optional()
        .describe('Non-negative whole display order; omitted update preserves order')
    })
  )
  .output(agendaOutput)
  .handleInvocation(ctx => changeAgenda(ctx.auth.token, 'label', ctx.input))
  .build();
