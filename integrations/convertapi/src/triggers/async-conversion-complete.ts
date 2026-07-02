import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let convertedFileSchema = z.object({
  fileName: z.string().describe('Name of the converted file'),
  fileExt: z.string().describe('Extension of the converted file'),
  fileSize: z.number().describe('Size of the converted file in bytes'),
  fileId: z.string().nullable().describe('ConvertAPI file ID'),
  url: z.string().nullable().describe('Download URL')
});

export let asyncConversionComplete = SlateTrigger.create(spec, {
  name: 'Async Conversion Complete',
  key: 'async_conversion_complete',
  description:
    'Triggers when an asynchronous file conversion job completes. Receives the job ID via webhook and fetches the full conversion result.'
})
  .input(
    z.object({
      jobId: z.string().describe('The async conversion job ID')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The completed async job ID'),
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z.number().describe('Conversion duration in seconds'),
      files: z.array(convertedFileSchema).describe('Converted output files')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { JobId?: string };

      if (!body.JobId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            jobId: body.JobId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let jobResult = await client.getAsyncJobResult(ctx.input.jobId);

      if (jobResult.status === 'completed' && jobResult.result) {
        return {
          type: 'conversion.completed',
          id: ctx.input.jobId,
          output: {
            jobId: ctx.input.jobId,
            conversionCost: jobResult.result.conversionCost,
            conversionTime: jobResult.result.conversionTime,
            files: jobResult.result.files
          }
        };
      }

      return {
        type: 'conversion.completed',
        id: ctx.input.jobId,
        output: {
          jobId: ctx.input.jobId,
          conversionCost: 0,
          conversionTime: 0,
          files: []
        }
      };
    }
  })
  .build();
