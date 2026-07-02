import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z
  .object({
    name: z.string().optional().describe('File name'),
    totalBytes: z.number().optional().describe('File size in bytes'),
    creationDate: z.string().optional().describe('File creation date'),
    description: z.string().optional().describe('File description')
  })
  .passthrough();

let leaderboardEntrySchema = z
  .object({
    teamId: z.number().optional().describe('Team ID'),
    teamName: z.string().optional().describe('Team name'),
    submissionDate: z.string().optional().describe('Submission date'),
    score: z.string().optional().describe('Submission score')
  })
  .passthrough();

let submissionSchema = z
  .object({
    ref: z.number().optional().describe('Submission reference number'),
    totalBytes: z.number().optional().describe('Submission file size'),
    date: z.string().optional().describe('Submission date'),
    description: z.string().optional().describe('Submission description'),
    errorDescription: z.string().optional().describe('Error description if submission failed'),
    fileName: z.string().optional().describe('Submitted file name'),
    publicScore: z.string().optional().describe('Public leaderboard score'),
    privateScore: z.string().optional().describe('Private leaderboard score'),
    status: z.string().optional().describe('Submission status')
  })
  .passthrough();

export let getCompetitionDetails = SlateTool.create(spec, {
  name: 'Get Competition Details',
  key: 'get_competition_details',
  description: `Retrieve detailed information about a specific Kaggle competition, including its data files, leaderboard, and your submission history. Provide the competition slug (e.g., "titanic") to get comprehensive details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      competitionSlug: z
        .string()
        .describe(
          'The competition slug/name (e.g., "titanic", "house-prices-advanced-regression-techniques")'
        ),
      includeFiles: z
        .boolean()
        .optional()
        .describe('Whether to include the list of data files'),
      includeLeaderboard: z
        .boolean()
        .optional()
        .describe('Whether to include the leaderboard'),
      includeSubmissions: z
        .boolean()
        .optional()
        .describe('Whether to include your submission history')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).optional().describe('Competition data files'),
      leaderboard: z
        .array(leaderboardEntrySchema)
        .optional()
        .describe('Competition leaderboard entries'),
      submissions: z
        .array(submissionSchema)
        .optional()
        .describe('Your submissions to this competition')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let result: Record<string, any> = {};
    let parts: string[] = [];

    if (ctx.input.includeFiles !== false) {
      let filesData = await client.listCompetitionFiles(ctx.input.competitionSlug);
      result.files = filesData?.dataFiles ?? filesData ?? [];
      parts.push(`${(result.files as any[]).length} file(s)`);
    }

    if (ctx.input.includeLeaderboard) {
      let leaderboard = await client.viewCompetitionLeaderboard(ctx.input.competitionSlug);
      result.leaderboard = leaderboard?.submissions ?? leaderboard ?? [];
      parts.push(`${(result.leaderboard as any[]).length} leaderboard entry(ies)`);
    }

    if (ctx.input.includeSubmissions) {
      let submissions = await client.listCompetitionSubmissions(ctx.input.competitionSlug);
      result.submissions = submissions ?? [];
      parts.push(`${(result.submissions as any[]).length} submission(s)`);
    }

    return {
      output: result as any,
      message: `Retrieved competition details for **${ctx.input.competitionSlug}**: ${parts.join(', ') || 'basic info'}.`
    };
  })
  .build();
