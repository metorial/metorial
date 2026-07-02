import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scanFile = SlateTool.create(spec, {
  name: 'Scan File',
  key: 'scan_file',
  description: `Submit a file hash for re-analysis by VirusTotal's 70+ antivirus engines and security tools. This triggers a new scan of an already-known file using its SHA-256, SHA-1, or MD5 hash. Use this to get fresh scan results for a previously submitted file.`,
  constraints: [
    'The file must have been previously submitted to VirusTotal.',
    'Public API users are limited to 4 requests per minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileHash: z.string().describe('SHA-256, SHA-1, or MD5 hash of the file to rescan')
    })
  )
  .output(
    z.object({
      analysisId: z.string().describe('ID of the analysis that was queued'),
      analysisType: z.string().describe('Type of the analysis object'),
      selfLink: z.string().optional().describe('API link to retrieve the analysis status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.rescanFile(ctx.input.fileHash);

    return {
      output: {
        analysisId: result?.id ?? '',
        analysisType: result?.type ?? 'analysis',
        selfLink: result?.links?.self
      },
      message: `Re-scan queued for file \`${ctx.input.fileHash}\`. Analysis ID: \`${result?.id}\`. Use the **Get Analysis Status** tool to check when scanning completes.`
    };
  })
  .build();
