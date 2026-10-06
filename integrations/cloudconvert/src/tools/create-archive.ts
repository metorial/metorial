import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAndRead, jobMessage, singleResult } from '../lib/jobs';
import { singleFileOutput, sourceUrl, tagInput, waitInput } from '../lib/schemas';
import type { Tasks } from '../lib/validation';
import { spec } from '../spec';

export const createArchive = SlateTool.create(spec, {
  name: 'Create Archive',
  key: 'create_archive',
  description:
    'Create a downloadable ZIP, RAR, 7Z, TAR, TAR.GZ, or TAR.BZ2 archive from files at public URLs.',
  constraints: [
    'Production processing can consume conversion credits. Sandbox only accepts whitelisted files.',
    'Download result files before the job is deleted, normally 24 hours after completion.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sourceUrls: z.array(sourceUrl).min(1).max(50),
      outputFormat: z.enum(['zip', 'rar', '7z', 'tar', 'tar.gz', 'tar.bz2']).default('zip'),
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(singleFileOutput)
  .handleInvocation(async ctx => {
    const tasks: Tasks = {};
    const names = ctx.input.sourceUrls.map((url, index) => {
      const name = `import-file-${index}`;
      tasks[name] = { operation: 'import/url', url };
      return name;
    });
    tasks['create-archive'] = {
      operation: 'archive',
      input: names,
      output_format: ctx.input.outputFormat
    };
    tasks['export-file'] = { operation: 'export/url', input: ['create-archive'] };
    const job = await createAndRead(ctx, tasks, ctx.input);
    return { output: singleResult(job), message: jobMessage(job, 'Create Archive') };
  })
  .build();
