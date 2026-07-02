import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  name: z.string().optional().describe('Location name.'),
  latitude: z.number().optional().describe('Latitude coordinate.'),
  longitude: z.number().optional().describe('Longitude coordinate.'),
  distance: z.number().optional().describe('Search radius distance.'),
  unit: z.string().optional().describe('Distance unit (e.g., "km", "mi").')
});

let skillSchema = z.object({
  name: z.string().describe('Skill name.'),
  required: z.boolean().optional().describe('Whether this skill is required.')
});

let languageSchema = z.object({
  name: z.string().describe('Language name.'),
  required: z.boolean().optional().describe('Whether this language is required.')
});

export let searchAndMatch = SlateTool.create(spec, {
  name: 'Search & Match',
  key: 'search_and_match',
  description: `Search through parsed resumes or job descriptions using Affinda's Search & Match algorithm. Match resumes against job descriptions or vice versa, or search using custom criteria like job titles, skills, experience, education, and location.

Returns a ranked shortlist with matching scores for each category.`,
  instructions: [
    'Provide either a jobDescriptionIdentifier to search resumes, or a resumeIdentifier to search job descriptions.',
    'Alternatively, provide custom search criteria like jobTitles, skills, locations, etc.',
    'Weight parameters (0 to 1) control the relative importance of each matching category.',
    'Documents must be indexed before they can be searched.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchType: z
        .enum(['resumes', 'job_descriptions'])
        .describe('Whether to search through resumes or job descriptions.'),
      indices: z.array(z.string()).optional().describe('Index names to search within.'),
      jobDescriptionIdentifier: z
        .string()
        .optional()
        .describe(
          'Job description identifier to auto-populate search criteria and find matching resumes.'
        ),
      resumeIdentifier: z
        .string()
        .optional()
        .describe('Resume identifier to find matching job descriptions.'),
      jobTitles: z.array(z.string()).optional().describe('Job titles to search for.'),
      jobTitlesWeight: z
        .number()
        .optional()
        .describe('Weight for job titles matching (0 to 1).'),
      jobTitlesRequired: z
        .boolean()
        .optional()
        .describe('Whether job title match is required.'),
      skills: z.array(skillSchema).optional().describe('Skills to search for.'),
      skillsWeight: z.number().optional().describe('Weight for skills matching (0 to 1).'),
      locations: z.array(locationSchema).optional().describe('Locations to search for.'),
      locationsWeight: z
        .number()
        .optional()
        .describe('Weight for location matching (0 to 1).'),
      locationsRequired: z
        .boolean()
        .optional()
        .describe('Whether location match is required.'),
      languages: z.array(languageSchema).optional().describe('Languages to search for.'),
      languagesWeight: z
        .number()
        .optional()
        .describe('Weight for language matching (0 to 1).'),
      yearsExperienceMin: z.number().optional().describe('Minimum years of experience.'),
      yearsExperienceMax: z.number().optional().describe('Maximum years of experience.'),
      yearsExperienceWeight: z
        .number()
        .optional()
        .describe('Weight for years of experience matching (0 to 1).'),
      yearsExperienceRequired: z
        .boolean()
        .optional()
        .describe('Whether years of experience match is required.'),
      degrees: z.array(z.string()).optional().describe('Degree names to search for.'),
      degreesRequired: z.boolean().optional().describe('Whether degree match is required.'),
      institutions: z
        .array(z.string())
        .optional()
        .describe('Institution names to search for.'),
      institutionsRequired: z
        .boolean()
        .optional()
        .describe('Whether institution match is required.'),
      educationWeight: z
        .number()
        .optional()
        .describe('Weight for education matching (0 to 1).'),
      offset: z.number().optional().describe('Pagination offset.'),
      limit: z.number().optional().describe('Maximum results to return (max 50).')
    })
  )
  .output(
    z.object({
      count: z.number().optional().describe('Total number of matching results.'),
      results: z
        .array(
          z.object({
            documentIdentifier: z
              .string()
              .optional()
              .describe('Document identifier of the matched result.'),
            score: z.number().optional().describe('Overall matching score.'),
            matchDetails: z.any().optional().describe('Detailed score breakdown by category.')
          })
        )
        .describe('Ranked list of matching results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let searchParams: Record<string, any> = {};

    if (ctx.input.indices) searchParams.indices = ctx.input.indices;
    if (ctx.input.jobDescriptionIdentifier)
      searchParams.jobDescription = ctx.input.jobDescriptionIdentifier;
    if (ctx.input.resumeIdentifier) searchParams.resume = ctx.input.resumeIdentifier;
    if (ctx.input.jobTitles) searchParams.jobTitles = ctx.input.jobTitles;
    if (ctx.input.jobTitlesWeight !== undefined)
      searchParams.jobTitlesWeight = ctx.input.jobTitlesWeight;
    if (ctx.input.jobTitlesRequired !== undefined)
      searchParams.jobTitlesRequired = ctx.input.jobTitlesRequired;
    if (ctx.input.skills) searchParams.skills = ctx.input.skills;
    if (ctx.input.skillsWeight !== undefined)
      searchParams.skillsWeight = ctx.input.skillsWeight;
    if (ctx.input.locations) searchParams.locations = ctx.input.locations;
    if (ctx.input.locationsWeight !== undefined)
      searchParams.locationsWeight = ctx.input.locationsWeight;
    if (ctx.input.locationsRequired !== undefined)
      searchParams.locationsRequired = ctx.input.locationsRequired;
    if (ctx.input.languages) searchParams.languages = ctx.input.languages;
    if (ctx.input.languagesWeight !== undefined)
      searchParams.languagesWeight = ctx.input.languagesWeight;
    if (ctx.input.yearsExperienceMin !== undefined)
      searchParams.yearsExperienceMin = ctx.input.yearsExperienceMin;
    if (ctx.input.yearsExperienceMax !== undefined)
      searchParams.yearsExperienceMax = ctx.input.yearsExperienceMax;
    if (ctx.input.yearsExperienceWeight !== undefined)
      searchParams.yearsExperienceWeight = ctx.input.yearsExperienceWeight;
    if (ctx.input.yearsExperienceRequired !== undefined)
      searchParams.yearsExperienceRequired = ctx.input.yearsExperienceRequired;
    if (ctx.input.degrees) searchParams.degrees = ctx.input.degrees;
    if (ctx.input.degreesRequired !== undefined)
      searchParams.degreesRequired = ctx.input.degreesRequired;
    if (ctx.input.institutions) searchParams.institutions = ctx.input.institutions;
    if (ctx.input.institutionsRequired !== undefined)
      searchParams.institutionsRequired = ctx.input.institutionsRequired;
    if (ctx.input.educationWeight !== undefined)
      searchParams.educationWeight = ctx.input.educationWeight;
    if (ctx.input.offset !== undefined) searchParams.offset = ctx.input.offset;
    if (ctx.input.limit !== undefined) searchParams.limit = ctx.input.limit;

    ctx.info(`Searching ${ctx.input.searchType}...`);

    let result =
      ctx.input.searchType === 'resumes'
        ? await client.searchResumes(searchParams)
        : await client.searchJobDescriptions(searchParams);

    let results = (result.results ?? []).map((r: any) => ({
      documentIdentifier: r.identifier ?? r.document,
      score: r.score,
      matchDetails: r.scores ?? r.details
    }));

    return {
      output: {
        count: result.count ?? results.length,
        results
      },
      message: `Found **${result.count ?? results.length}** matching ${ctx.input.searchType === 'resumes' ? 'resume(s)' : 'job description(s)'}.`
    };
  })
  .build();
