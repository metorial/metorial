import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteIdentifier: z
    .string()
    .describe('Canonical note identifier; use it to update or delete the note'),
  noteId: z
    .number()
    .optional()
    .describe('Legacy numeric note ID, present only for safe decimal IDs'),
  noteBody: z.string().describe('Note content'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  creatorName: z.string().nullable().optional().describe('Name of the note creator'),
  creatorEmail: z.string().nullable().optional().describe('Email of the note creator')
});

let toNoteIdentifier = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  throw createApiServiceError(
    'Re:amaze returned an invalid note identifier. Call list_contact_notes to verify the contact notes before retrying a write.'
  );
};

let numericNoteAlias = (identifier: string) => {
  let numeric = /^\d+$/.test(identifier) ? Number(identifier) : Number.NaN;
  return Number.isSafeInteger(numeric) ? numeric : undefined;
};

let resolveNoteIdentifier = (input: { noteIdentifier?: string; noteId?: number }) => {
  if (input.noteIdentifier !== undefined && !input.noteIdentifier.trim()) {
    throw createApiServiceError('Provide the noteIdentifier returned by list_contact_notes.');
  }
  if (
    input.noteId !== undefined &&
    (!Number.isSafeInteger(input.noteId) || input.noteId < 0)
  ) {
    throw createApiServiceError(
      'Provide a safe integer noteId or use the canonical noteIdentifier.'
    );
  }
  if (input.noteIdentifier === undefined && input.noteId === undefined) {
    throw createApiServiceError(
      'Provide noteIdentifier from list_contact_notes, or noteId for a numeric note identifier.'
    );
  }
  if (
    input.noteIdentifier !== undefined &&
    input.noteId !== undefined &&
    input.noteIdentifier !== String(input.noteId) &&
    numericNoteAlias(input.noteIdentifier) !== input.noteId
  ) {
    throw createApiServiceError(
      'noteIdentifier and noteId refer to different notes. Provide one identifier.'
    );
  }
  return input.noteIdentifier ?? String(input.noteId);
};

let providerNoteSchema = z.object({
  id: z.unknown(),
  note: z.string().optional(),
  body: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  creator: z
    .object({
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional()
    })
    .nullable()
    .optional()
});

let readNotes = (result: unknown, operation: string) => {
  let notes: unknown = result;
  if (isApiErrorRecord(result)) {
    notes = 'id' in result ? [result] : (result.notes ?? result.note);
    if (isApiErrorRecord(notes)) notes = [notes];
  }
  let parsed = z.array(providerNoteSchema).safeParse(notes);
  if (!parsed.success) {
    throw createApiServiceError(
      `Re:amaze returned an unexpected notes response while ${operation}. Call list_contact_notes to verify the contact's notes before retrying a write.`
    );
  }

  return parsed.data.map(n => {
    let noteBody = n.note ?? n.body;
    if (noteBody === undefined) {
      throw createApiServiceError(
        `Re:amaze returned a note without its content while ${operation}. Call list_contact_notes to verify the contact's notes before retrying a write.`
      );
    }
    let noteIdentifier = toNoteIdentifier(n.id);
    return {
      noteIdentifier,
      noteId: numericNoteAlias(noteIdentifier),
      noteBody,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
      creatorName: n.creator?.name,
      creatorEmail: n.creator?.email
    };
  });
};

let validateNoteInput = (input: {
  contactIdentifier: string;
  creatorEmail?: string;
  createdAt?: string;
}) => {
  if (!input.contactIdentifier.trim()) {
    throw createApiServiceError('Provide a contact email address or phone number.');
  }
  if (input.creatorEmail !== undefined && !z.email().safeParse(input.creatorEmail).success) {
    throw createApiServiceError('Provide a valid staff email address for creatorEmail.');
  }
  if (
    input.createdAt !== undefined &&
    !z.iso.datetime({ offset: true }).safeParse(input.createdAt).success
  ) {
    throw createApiServiceError('Provide createdAt as an ISO 8601 datetime with a timezone.');
  }
};

export let listContactNotes = SlateTool.create(spec, {
  name: 'List Contact Notes',
  key: 'list_contact_notes',
  description: `Retrieve all notes attached to a specific contact, including their canonical noteIdentifier values for updates and deletion. The contact is identified by email or phone number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactIdentifier: z.string().describe('Contact email address or phone number')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).describe('List of notes for the contact')
    })
  )
  .handleInvocation(async ctx => {
    validateNoteInput(ctx.input);
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listContactNotes(ctx.input.contactIdentifier);
    let notes = readNotes(result, 'listing contact notes');

    return {
      output: { notes },
      message: `Found **${notes.length}** notes for contact **${ctx.input.contactIdentifier}**.`
    };
  })
  .build();

export let createContactNote = SlateTool.create(spec, {
  name: 'Create Contact Note',
  key: 'create_contact_note',
  description: `Add a new note to a specific contact. The contact is identified by email or phone number.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactIdentifier: z.string().describe('Contact email address or phone number'),
      noteBody: z.string().describe('Note content to add'),
      creatorEmail: z.string().optional().describe('Staff email to attribute the note to'),
      createdAt: z
        .string()
        .optional()
        .describe('ISO 8601 creation datetime with timezone; defaults to the current time')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    validateNoteInput(ctx.input);
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let existing = readNotes(
      await client.listContactNotes(ctx.input.contactIdentifier),
      'reading existing contact notes'
    );
    let existingIds = new Set(existing.map(note => note.noteIdentifier));
    let result = await client.createContactNote(
      ctx.input.contactIdentifier,
      ctx.input.noteBody,
      { creatorEmail: ctx.input.creatorEmail, createdAt: ctx.input.createdAt }
    );
    let candidates = readNotes(result, 'creating a contact note').filter(
      note => !existingIds.has(note.noteIdentifier) && note.noteBody === ctx.input.noteBody
    );
    let createdNote = candidates[0];
    if (candidates.length !== 1 || !createdNote) {
      throw createApiServiceError(
        'Re:amaze accepted the note request, but the newly created note could not be identified uniquely. Call list_contact_notes for this contact and verify the note before retrying; another create may add a duplicate.'
      );
    }

    return {
      output: createdNote,
      message: `Created note for contact **${ctx.input.contactIdentifier}**.`
    };
  })
  .build();

export let updateContactNote = SlateTool.create(spec, {
  name: 'Update Contact Note',
  key: 'update_contact_note',
  description: `Update a specific contact note. Call list_contact_notes for the contact and pass the noteIdentifier returned for the note.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactIdentifier: z.string().describe('Contact email address or phone number'),
      noteIdentifier: z
        .string()
        .optional()
        .describe('Canonical note identifier from list_contact_notes'),
      noteId: z
        .number()
        .optional()
        .describe('Legacy numeric note ID; provide this or noteIdentifier'),
      noteBody: z.string().describe('Replacement note content'),
      creatorEmail: z.string().optional().describe('Staff email to attribute the note to'),
      createdAt: z
        .string()
        .optional()
        .describe('Replacement ISO 8601 creation datetime with timezone')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    validateNoteInput(ctx.input);
    let noteIdentifier = resolveNoteIdentifier(ctx.input);
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let result = await client.updateContactNote(
      ctx.input.contactIdentifier,
      noteIdentifier,
      ctx.input.noteBody,
      { creatorEmail: ctx.input.creatorEmail, createdAt: ctx.input.createdAt }
    );
    let candidates = readNotes(result, 'updating a contact note').filter(
      note => note.noteIdentifier === noteIdentifier
    );
    let updatedNote = candidates[0];
    if (
      candidates.length !== 1 ||
      !updatedNote ||
      updatedNote.noteBody !== ctx.input.noteBody
    ) {
      throw createApiServiceError(
        'Re:amaze accepted the update request, but the updated note could not be confirmed. Call list_contact_notes for this contact and verify the note before retrying.'
      );
    }

    return {
      output: updatedNote,
      message: `Updated note **${noteIdentifier}** for contact **${ctx.input.contactIdentifier}**.`
    };
  })
  .build();

export let deleteContactNote = SlateTool.create(spec, {
  name: 'Delete Contact Note',
  key: 'delete_contact_note',
  description: `Delete a specific note from a contact. Provide the contact identifier and noteIdentifier returned by list_contact_notes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteIdentifier: z
        .string()
        .optional()
        .describe('Canonical note identifier from list_contact_notes'),
      noteId: z
        .number()
        .optional()
        .describe('Legacy numeric note ID; provide this or noteIdentifier'),
      contactIdentifier: z
        .string()
        .optional()
        .describe('Contact email address or phone number; required to address the note')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the note was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.contactIdentifier) {
      throw createApiServiceError(
        'Provide contactIdentifier (contact email address or phone number) and noteIdentifier. Call list_contact_notes for that contact to discover its note identifiers.'
      );
    }
    validateNoteInput({ contactIdentifier: ctx.input.contactIdentifier });
    let noteIdentifier = resolveNoteIdentifier(ctx.input);
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    await client.deleteContactNote(noteIdentifier, ctx.input.contactIdentifier);

    return {
      output: { deleted: true },
      message: `Deleted note **${noteIdentifier}** from contact **${ctx.input.contactIdentifier}**.`
    };
  })
  .build();
