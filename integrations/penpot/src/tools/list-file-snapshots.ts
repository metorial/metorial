import { SlateTool } from 'slates';
import { z } from 'zod';
import { makeClient } from '../lib/helpers';
import { mapSnapshot, snapshotSchema } from '../lib/snapshots';
import { spec } from '../spec';

export let listFileSnapshotsTool = SlateTool.create(spec, {
  key: 'list_file_snapshots',
  name: 'List File Snapshots',
  description:
    'List the visible saved versions of a design file, including labels, revision numbers, and creator information. Use the returned snapshot IDs to restore a version.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fileId: z.string().describe('File ID. Call list_files to discover accessible files.')
    })
  )
  .output(
    z.object({
      snapshots: z.array(snapshotSchema).describe('Visible versions returned by Penpot')
    })
  )
  .handleInvocation(async ctx => {
    let snapshots = (await makeClient(ctx).getFileSnapshots(ctx.input.fileId)).map(
      mapSnapshot
    );
    return {
      output: { snapshots },
      message: `Found **${snapshots.length}** saved version(s).`
    };
  })
  .build();
