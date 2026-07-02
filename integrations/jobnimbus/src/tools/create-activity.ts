import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createActivity = SlateTool.create(spec, {
  name: 'Create Activity',
  key: 'create_activity',
  description: `Create a new activity (note) in JobNimbus. Activities are associated with a contact or job and can include notes and other information.`
})
  .input(
    z.object({
      parentRecordId: z.string().describe('The contact or job ID to attach this activity to'),
      note: z.string().describe('The note/activity text content'),
      recordTypeName: z.string().optional().describe('Record type name (defaults to "Note")')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('Unique JobNimbus ID of the created activity'),
      note: z.string().optional().describe('The note content'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      primary: ctx.input.parentRecordId,
      note: ctx.input.note,
      record_type_name: ctx.input.recordTypeName || 'Note'
    };

    let result = await client.createActivity(data);

    return {
      output: {
        activityId: result.jnid,
        note: result.note,
        dateCreated: result.date_created
      },
      message: `Created activity on record ${ctx.input.parentRecordId}.`
    };
  })
  .build();
