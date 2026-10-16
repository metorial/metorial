import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let orgUnitId = z
  .string()
  .describe('Course org unit ID from list_enrollments or list_org_units.');
let folderId = z.string().describe('Assignment folder ID from list_assignments.');

export let updateAssignment = SlateTool.create(spec, {
  key: 'update_assignment',
  name: 'Update Assignment',
  description:
    'Update an assignment name, instructions, visibility, or dates while preserving other folder settings. Use list_assignments to discover folder IDs. Set a date to null to clear it.',
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId,
      folderId,
      name: z.string().optional(),
      instructions: z
        .string()
        .optional()
        .describe('Updated instructions, with HTML supported.'),
      isHidden: z.boolean().optional(),
      dueDate: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional()
    })
  )
  .output(z.object({ folderId: z.string(), name: z.string().optional(), raw: z.unknown() }))
  .handleInvocation(async ctx => {
    let update: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) update.Name = ctx.input.name;
    if (ctx.input.instructions !== undefined)
      update.CustomInstructions = { Content: ctx.input.instructions, Type: 'Html' };
    if (ctx.input.isHidden !== undefined) update.IsHidden = ctx.input.isHidden;
    if (ctx.input.dueDate !== undefined) update.DueDate = ctx.input.dueDate;
    if (ctx.input.startDate !== undefined || ctx.input.endDate !== undefined) {
      update.Availability = {
        ...(ctx.input.startDate !== undefined ? { StartDate: ctx.input.startDate } : {}),
        ...(ctx.input.endDate !== undefined ? { EndDate: ctx.input.endDate } : {})
      };
    }
    let raw = await createClient(ctx.config, ctx.auth).updateDropboxFolder(
      ctx.input.orgUnitId,
      ctx.input.folderId,
      update
    );
    return {
      output: { folderId: String(raw.Id), name: raw.Name ?? undefined, raw },
      message: `Updated assignment ${raw.Id}.`
    };
  })
  .build();

export let deleteAssignment = SlateTool.create(spec, {
  key: 'delete_assignment',
  name: 'Delete Assignment',
  description:
    'Delete an assignment folder and its associated submissions. Use list_assignments to discover the folder ID. This removes the assignment from the course.',
  tags: { destructive: true }
})
  .input(z.object({ orgUnitId, folderId }))
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    await createClient(ctx.config, ctx.auth).deleteDropboxFolder(
      ctx.input.orgUnitId,
      ctx.input.folderId
    );
    return { output: { success: true }, message: `Deleted assignment ${ctx.input.folderId}.` };
  })
  .build();
