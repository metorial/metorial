import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let matchResumeToJob = SlateTool.create(spec, {
  name: 'Match Resume to Job',
  key: 'match_resume_to_job',
  description: `Get a compatibility score between a specific resume and a specific job description. Returns an overall match score (0 to 1) along with category-level breakdowns for skills, experience, education, and more.

Both the resume and job description must already be uploaded and parsed in Affinda.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resumeIdentifier: z.string().describe('Identifier of the parsed resume document.'),
      jobDescriptionIdentifier: z
        .string()
        .describe('Identifier of the parsed job description document.'),
      indexName: z.string().optional().describe('Specific index to use for matching.'),
      jobTitlesWeight: z.number().optional().describe('Weight for job titles (0 to 1).'),
      skillsWeight: z.number().optional().describe('Weight for skills (0 to 1).'),
      educationWeight: z.number().optional().describe('Weight for education (0 to 1).'),
      yearsExperienceWeight: z
        .number()
        .optional()
        .describe('Weight for years of experience (0 to 1).'),
      locationsWeight: z.number().optional().describe('Weight for location (0 to 1).'),
      languagesWeight: z.number().optional().describe('Weight for languages (0 to 1).'),
      managementLevelWeight: z
        .number()
        .optional()
        .describe('Weight for management level (0 to 1).')
    })
  )
  .output(
    z.object({
      overallScore: z.number().describe('Overall match score between 0 and 1.'),
      categoryScores: z.any().optional().describe('Score breakdown by matching category.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let extraParams: Record<string, any> = {};
    if (ctx.input.indexName) extraParams.index = ctx.input.indexName;
    if (ctx.input.jobTitlesWeight !== undefined)
      extraParams.job_titles_weight = ctx.input.jobTitlesWeight;
    if (ctx.input.skillsWeight !== undefined)
      extraParams.skills_weight = ctx.input.skillsWeight;
    if (ctx.input.educationWeight !== undefined)
      extraParams.education_weight = ctx.input.educationWeight;
    if (ctx.input.yearsExperienceWeight !== undefined)
      extraParams.years_experience_weight = ctx.input.yearsExperienceWeight;
    if (ctx.input.locationsWeight !== undefined)
      extraParams.locations_weight = ctx.input.locationsWeight;
    if (ctx.input.languagesWeight !== undefined)
      extraParams.languages_weight = ctx.input.languagesWeight;
    if (ctx.input.managementLevelWeight !== undefined)
      extraParams.management_level_weight = ctx.input.managementLevelWeight;

    let result = await client.matchResumeToJob(
      ctx.input.resumeIdentifier,
      ctx.input.jobDescriptionIdentifier,
      extraParams
    );

    return {
      output: {
        overallScore: result.score ?? 0,
        categoryScores: result.scores ?? result.details
      },
      message: `Match score: **${((result.score ?? 0) * 100).toFixed(1)}%** between resume \`${ctx.input.resumeIdentifier}\` and job description \`${ctx.input.jobDescriptionIdentifier}\`.`
    };
  })
  .build();
