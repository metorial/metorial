import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNotes = SlateTool.create(spec, {
  name: 'Get Notes',
  key: 'get_notes',
  description: `Retrieve all notes (annotations with comments) from a Matterport model. Notes are collaborative markers placed in 3D space that support threaded comments. Includes both enabled and disabled notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.string().describe('Unique note identifier'),
            created: z.string().nullable().optional().describe('Creation timestamp'),
            modified: z.string().nullable().optional().describe('Last modified timestamp'),
            label: z.string().nullable().optional().describe('Note label'),
            enabled: z.boolean().nullable().optional().describe('Whether the note is enabled'),
            createdBy: z
              .object({
                userId: z.string().nullable().optional(),
                firstName: z.string().nullable().optional(),
                lastName: z.string().nullable().optional(),
                email: z.string().nullable().optional()
              })
              .nullable()
              .optional()
              .describe('User who created the note'),
            resolution: z.string().nullable().optional().describe('Resolution status'),
            color: z.string().nullable().optional().describe('Note color'),
            anchorPosition: z.any().nullable().optional().describe('3D anchor position'),
            totalComments: z
              .number()
              .nullable()
              .optional()
              .describe('Total number of comments')
          })
        )
        .describe('List of notes on the model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let notes = await client.getNotes(ctx.input.modelId);

    let mappedNotes = (notes || []).map((n: any) => ({
      noteId: n.id,
      created: n.created,
      modified: n.modified,
      label: n.label,
      enabled: n.enabled,
      createdBy: n.createdBy
        ? {
            userId: n.createdBy.id || null,
            firstName: n.createdBy.firstName || null,
            lastName: n.createdBy.lastName || null,
            email: n.createdBy.email || null
          }
        : null,
      resolution: n.resolution,
      color: n.color,
      anchorPosition: n.anchorPosition || null,
      totalComments: n.totalComments
    }));

    return {
      output: { notes: mappedNotes },
      message: `Found **${mappedNotes.length}** notes on model **${ctx.input.modelId}**.`
    };
  })
  .build();
