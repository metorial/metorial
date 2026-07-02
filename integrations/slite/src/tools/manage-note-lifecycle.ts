import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNoteLifecycle = SlateTool.create(spec, {
  name: 'Manage Note Lifecycle',
  key: 'manage_note_lifecycle',
  description: `Manage a note's lifecycle state. Supports verifying, flagging as outdated, archiving/unarchiving, and changing ownership. Use the **action** field to select the operation.`,
  instructions: [
    'Set action to "verify" to mark a note as verified, optionally with an expiration date.',
    'Set action to "flag_outdated" to flag a note as needing review, with a required reason.',
    'Set action to "archive" or "unarchive" to change archive state.',
    'Set action to "update_owner" to change ownership — provide either ownerUserId or ownerGroupId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to manage'),
      action: z
        .enum(['verify', 'flag_outdated', 'archive', 'unarchive', 'update_owner'])
        .describe('Lifecycle action to perform'),
      verifyUntil: z
        .string()
        .optional()
        .describe(
          'ISO 8601 expiration date for verification (only for "verify" action). Omit for no expiration.'
        ),
      outdatedReason: z
        .string()
        .optional()
        .describe('Reason for flagging as outdated (required for "flag_outdated" action)'),
      ownerUserId: z
        .string()
        .optional()
        .describe('User ID to assign as new owner (for "update_owner" action)'),
      ownerGroupId: z
        .string()
        .optional()
        .describe('Group ID to assign as new owner (for "update_owner" action)')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the managed note'),
      title: z.string().describe('Title of the note'),
      url: z.string().describe('URL to view the note'),
      reviewState: z.string().optional().describe('Updated review state'),
      archivedAt: z.string().nullable().optional().describe('Archive timestamp or null'),
      owner: z
        .object({
          userId: z.string().optional(),
          groupId: z.string().optional()
        })
        .optional()
        .describe('Updated owner')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { noteId, action } = ctx.input;
    let note: any;
    let actionDescription: string;

    switch (action) {
      case 'verify':
        note = await client.verifyNote(noteId, ctx.input.verifyUntil);
        actionDescription = 'Verified';
        break;

      case 'flag_outdated':
        if (!ctx.input.outdatedReason) {
          throw new Error('outdatedReason is required for the flag_outdated action');
        }
        note = await client.flagNoteAsOutdated(noteId, ctx.input.outdatedReason);
        actionDescription = 'Flagged as outdated';
        break;

      case 'archive':
        note = await client.setNoteArchived(noteId, true);
        actionDescription = 'Archived';
        break;

      case 'unarchive':
        note = await client.setNoteArchived(noteId, false);
        actionDescription = 'Unarchived';
        break;

      case 'update_owner':
        if (!ctx.input.ownerUserId && !ctx.input.ownerGroupId) {
          throw new Error(
            'Either ownerUserId or ownerGroupId is required for the update_owner action'
          );
        }
        note = await client.updateNoteOwner(noteId, {
          userId: ctx.input.ownerUserId,
          groupId: ctx.input.ownerGroupId
        });
        actionDescription = 'Updated owner';
        break;
    }

    return {
      output: {
        noteId: note.id,
        title: note.title,
        url: note.url,
        reviewState: note.reviewState,
        archivedAt: note.archivedAt ?? null,
        owner: note.owner
      },
      message: `${actionDescription} note **${note.title}**`
    };
  })
  .build();
