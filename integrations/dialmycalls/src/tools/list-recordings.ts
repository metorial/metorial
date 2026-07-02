import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecordings = SlateTool.create(spec, {
  name: 'List Recordings',
  key: 'list_recordings',
  description: `Retrieve audio recordings from your DialMyCalls account. These recordings are used as messages in voice call broadcasts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordingId: z
        .string()
        .optional()
        .describe('Fetch a specific recording by ID. If omitted, lists all recordings.'),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      recordings: z.array(
        z.object({
          recordingId: z.string().optional(),
          name: z.string().optional(),
          recordingType: z.string().optional(),
          seconds: z.number().optional(),
          fileUrl: z.string().optional(),
          processed: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.recordingId) {
      let rec = await client.getRecording(ctx.input.recordingId);
      return {
        output: {
          recordings: [
            {
              recordingId: rec.id,
              name: rec.name,
              recordingType: rec.type,
              seconds: rec.seconds,
              fileUrl: rec.url,
              processed: rec.processed,
              createdAt: rec.created_at,
              updatedAt: rec.updated_at
            }
          ]
        },
        message: `Retrieved recording **${rec.name}**.`
      };
    }

    let rawRecordings = await client.listRecordings(ctx.input.range);
    let recordings = rawRecordings.map(r => ({
      recordingId: r.id,
      name: r.name,
      recordingType: r.type,
      seconds: r.seconds,
      fileUrl: r.url,
      processed: r.processed,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: { recordings },
      message: `Retrieved **${recordings.length}** recording(s).`
    };
  })
  .build();
