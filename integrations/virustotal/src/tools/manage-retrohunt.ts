import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRetrohunt = SlateTool.create(spec, {
  name: 'Manage Retrohunt',
  key: 'manage_retrohunt',
  description: `Create and manage Retrohunt jobs that apply YARA rules to VirusTotal's historical file collection. Jobs scan 600TB+ of files submitted during the past year and take 3-4 hours to complete. **Premium feature.**`,
  constraints: [
    'This feature requires a VirusTotal Premium API key.',
    'Maximum 300 YARA rules per Retrohunt job.',
    'Limit of 10 concurrent jobs per user.',
    'Jobs take 3-4 hours to complete.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'get_matches'])
        .describe('Operation to perform'),
      jobId: z.string().optional().describe('Job ID (required for get, get_matches)'),
      rules: z.string().optional().describe('YARA rules content (required for create)'),
      corpus: z.string().optional().describe('Corpus to scan (for create, e.g. "main")'),
      notificationEmail: z
        .string()
        .optional()
        .describe('Email for completion notification (for create)'),
      limit: z.number().optional().default(10).describe('Max items to return'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      job: z
        .object({
          jobId: z.string().describe('Retrohunt job ID'),
          status: z.string().optional().describe('Job status'),
          rules: z.string().optional().describe('YARA rules'),
          numMatchingFiles: z.number().optional().describe('Number of matching files'),
          scannedBytes: z.string().optional().describe('Bytes scanned so far'),
          startDate: z.string().optional().describe('Job start date (Unix timestamp)'),
          finishDate: z.string().optional().describe('Job finish date (Unix timestamp)'),
          progress: z.number().optional().describe('Job completion percentage')
        })
        .optional()
        .describe('Retrohunt job details'),
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Retrohunt job ID'),
            status: z.string().optional().describe('Job status'),
            numMatchingFiles: z.number().optional().describe('Number of matching files'),
            progress: z.number().optional().describe('Job progress percentage')
          })
        )
        .optional()
        .describe('List of Retrohunt jobs'),
      matchingFiles: z
        .array(
          z.object({
            fileHash: z.string().describe('SHA-256 hash of matching file'),
            fileType: z.string().optional().describe('Object type'),
            attributes: z.record(z.string(), z.any()).optional().describe('File attributes')
          })
        )
        .optional()
        .describe('Matching files for a job'),
      nextCursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.rules) {
          throw new Error('YARA rules are required to create a Retrohunt job.');
        }
        let result = await client.createRetrohuntJob(
          ctx.input.rules,
          ctx.input.corpus,
          ctx.input.notificationEmail
        );
        let attrs = result?.attributes ?? {};
        return {
          output: {
            job: {
              jobId: result?.id ?? '',
              status: attrs.status,
              rules: attrs.rules,
              numMatchingFiles: attrs.num_matches,
              scannedBytes: attrs.scanned_bytes?.toString(),
              startDate: attrs.start_date?.toString(),
              finishDate: attrs.finish_date?.toString(),
              progress: attrs.progress
            }
          },
          message: `Retrohunt job \`${result?.id}\` created. Status: **${attrs.status ?? 'queued'}**. It will take 3-4 hours to complete.`
        };
      }
      case 'get': {
        if (!ctx.input.jobId) {
          throw new Error('Job ID is required for get.');
        }
        let result = await client.getRetrohuntJob(ctx.input.jobId);
        let attrs = result?.attributes ?? {};
        return {
          output: {
            job: {
              jobId: result?.id ?? '',
              status: attrs.status,
              rules: attrs.rules,
              numMatchingFiles: attrs.num_matches,
              scannedBytes: attrs.scanned_bytes?.toString(),
              startDate: attrs.start_date?.toString(),
              finishDate: attrs.finish_date?.toString(),
              progress: attrs.progress
            }
          },
          message: `Retrohunt job \`${ctx.input.jobId}\` — **Status:** ${attrs.status ?? 'unknown'}${attrs.progress !== undefined ? ` (${attrs.progress}% complete)` : ''}${attrs.num_matches !== undefined ? ` — **Matches:** ${attrs.num_matches}` : ''}`
        };
      }
      case 'list': {
        let result = await client.getRetrohuntJobs(ctx.input.limit, ctx.input.cursor);
        let jobs = (result?.data ?? []).map((item: any) => ({
          jobId: item.id ?? '',
          status: item.attributes?.status,
          numMatchingFiles: item.attributes?.num_matches,
          progress: item.attributes?.progress
        }));
        return {
          output: {
            jobs,
            nextCursor: result?.meta?.cursor
          },
          message: `Found **${jobs.length}** Retrohunt jobs.`
        };
      }
      case 'get_matches': {
        if (!ctx.input.jobId) {
          throw new Error('Job ID is required for get_matches.');
        }
        let result = await client.getRetrohuntJobMatchingFiles(
          ctx.input.jobId,
          ctx.input.limit,
          ctx.input.cursor
        );
        let files = (result?.data ?? []).map((item: any) => ({
          fileHash: item.id ?? '',
          fileType: item.type,
          attributes: item.attributes
        }));
        return {
          output: {
            matchingFiles: files,
            nextCursor: result?.meta?.cursor
          },
          message: `Found **${files.length}** matching files for Retrohunt job \`${ctx.input.jobId}\`.`
        };
      }
    }
  })
  .build();
