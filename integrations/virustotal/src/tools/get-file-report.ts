import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let analysisStatsSchema = z
  .object({
    malicious: z.number().optional(),
    suspicious: z.number().optional(),
    undetected: z.number().optional(),
    harmless: z.number().optional(),
    timeout: z.number().optional(),
    confirmedTimeout: z.number().optional(),
    failure: z.number().optional(),
    typeUnsupported: z.number().optional()
  })
  .optional();

export let getFileReport = SlateTool.create(spec, {
  name: 'Get File Report',
  key: 'get_file_report',
  description: `Retrieve the full analysis report for a file by its hash. Returns detection results from 70+ antivirus engines, file metadata, reputation scores, and community votes. Use SHA-256, SHA-1, or MD5 hash to look up the file.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileHash: z.string().describe('SHA-256, SHA-1, or MD5 hash of the file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique identifier (SHA-256) of the file'),
      fileType: z.string().optional().describe('Type of the file object'),
      sha256: z.string().optional().describe('SHA-256 hash'),
      sha1: z.string().optional().describe('SHA-1 hash'),
      md5: z.string().optional().describe('MD5 hash'),
      fileName: z.string().optional().describe('Meaningful name of the file'),
      fileSize: z.number().optional().describe('File size in bytes'),
      fileTypeTag: z.string().optional().describe('Detected file type tag'),
      fileTypeMime: z.string().optional().describe('MIME type of the file'),
      reputation: z.number().optional().describe('Community reputation score'),
      totalVotes: z
        .object({
          harmless: z.number().optional(),
          malicious: z.number().optional()
        })
        .optional()
        .describe('Community votes summary'),
      lastAnalysisDate: z
        .string()
        .optional()
        .describe('Date of last analysis (Unix timestamp)'),
      lastAnalysisStats: analysisStatsSchema.describe(
        'Summary of last analysis results by category'
      ),
      tags: z.array(z.string()).optional().describe('Tags assigned to the file'),
      firstSubmissionDate: z
        .string()
        .optional()
        .describe('Date of first submission (Unix timestamp)'),
      timesSubmitted: z.number().optional().describe('Number of times file was submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getFileReport(ctx.input.fileHash);
    let attrs = result?.attributes ?? {};

    let malicious = attrs.last_analysis_stats?.malicious ?? 0;
    let total = Object.values(attrs.last_analysis_stats ?? {}).reduce(
      (sum: number, v) => sum + (typeof v === 'number' ? v : 0),
      0
    );

    return {
      output: {
        fileId: result?.id ?? '',
        fileType: result?.type,
        sha256: attrs.sha256,
        sha1: attrs.sha1,
        md5: attrs.md5,
        fileName: attrs.meaningful_name ?? attrs.names?.[0],
        fileSize: attrs.size,
        fileTypeTag: attrs.type_tag,
        fileTypeMime: attrs.type_description,
        reputation: attrs.reputation,
        totalVotes: attrs.total_votes
          ? {
              harmless: attrs.total_votes.harmless,
              malicious: attrs.total_votes.malicious
            }
          : undefined,
        lastAnalysisDate: attrs.last_analysis_date?.toString(),
        lastAnalysisStats: attrs.last_analysis_stats
          ? {
              malicious: attrs.last_analysis_stats.malicious,
              suspicious: attrs.last_analysis_stats.suspicious,
              undetected: attrs.last_analysis_stats.undetected,
              harmless: attrs.last_analysis_stats.harmless,
              timeout: attrs.last_analysis_stats.timeout,
              confirmedTimeout: attrs.last_analysis_stats['confirmed-timeout'],
              failure: attrs.last_analysis_stats.failure,
              typeUnsupported: attrs.last_analysis_stats['type-unsupported']
            }
          : undefined,
        tags: attrs.tags,
        firstSubmissionDate: attrs.first_submission_date?.toString(),
        timesSubmitted: attrs.times_submitted
      },
      message: `**File report for** \`${ctx.input.fileHash}\`\n- **Name:** ${attrs.meaningful_name ?? 'Unknown'}\n- **Detection:** ${malicious}/${total} engines flagged as malicious\n- **Reputation:** ${attrs.reputation ?? 'N/A'}\n- **Size:** ${attrs.size ? `${attrs.size} bytes` : 'N/A'}`
    };
  })
  .build();
