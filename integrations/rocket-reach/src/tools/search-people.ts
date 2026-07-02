import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let profileSchema = z.object({
  profileId: z.number().optional().describe('RocketReach internal profile ID'),
  name: z.string().nullable().optional().describe('Full name of the person'),
  currentTitle: z.string().nullable().optional().describe('Current job title'),
  currentEmployer: z.string().nullable().optional().describe('Current employer name'),
  currentEmployerDomain: z.string().nullable().optional().describe('Current employer domain'),
  location: z.string().nullable().optional().describe('Geographic location'),
  linkedinUrl: z.string().nullable().optional().describe('LinkedIn profile URL'),
  profilePic: z.string().nullable().optional().describe('URL to profile picture')
});

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search for professionals by name, job title, company, location, skills, and many other criteria. Returns matching profile summaries **without contact details** — use the **Lookup Person** tool to retrieve emails and phone numbers for specific profiles.

Useful for lead generation, prospecting, and finding people at specific companies or in specific roles.`,
  instructions: [
    'Search results do not include contact information. Use the Lookup Person tool with a profileId from the results to get emails and phone numbers.',
    'Prepend a "-" to any filter value to exclude it (e.g., "-Google" to exclude people at Google).',
    'For location filtering, append "::~50mi" to a location string to search within a 50-mile radius.'
  ],
  constraints: [
    'Maximum 100 results per page.',
    'Start index cannot exceed 10,000.',
    'Searching does not consume lookup or export credits.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Full name or partial name to search for'),
      currentTitle: z.string().optional().describe('Job title to search for'),
      currentEmployer: z.string().optional().describe('Company name to filter by'),
      companyDomain: z
        .string()
        .optional()
        .describe('Company domain to filter by (e.g., "google.com")'),
      companyIndustry: z.string().optional().describe('Industry to filter by'),
      companySize: z
        .string()
        .optional()
        .describe('Company size range (e.g., "1-10", "11-50", "51-200")'),
      location: z
        .string()
        .optional()
        .describe('Location to filter by. Append "::~50mi" for radius search.'),
      skills: z.array(z.string()).optional().describe('Skills to filter by'),
      department: z.string().optional().describe('Department to filter by'),
      managementLevels: z.string().optional().describe('Management level filter'),
      school: z.string().optional().describe('Educational institution to filter by'),
      degree: z.string().optional().describe('Degree type to filter by'),
      major: z.string().optional().describe('Major or field of study to filter by'),
      yearsExperience: z
        .string()
        .optional()
        .describe('Years of experience range (e.g., "1-5", "6-10")'),
      keyword: z.string().optional().describe('General keyword to search across profiles'),
      start: z
        .number()
        .optional()
        .describe('Start index for pagination (1-based, default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default: 10)'),
      orderBy: z
        .enum(['relevance', 'popularity', 'score'])
        .optional()
        .describe('Result ordering')
    })
  )
  .output(
    z.object({
      profiles: z.array(profileSchema).describe('Matching professional profiles'),
      pagination: z
        .object({
          start: z.number().optional().describe('Current start index'),
          pageSize: z.number().optional().describe('Results per page'),
          totalResults: z.number().optional().describe('Total number of matching results')
        })
        .optional()
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let query: Record<string, any> = {};
    if (ctx.input.name) query.name = [ctx.input.name];
    if (ctx.input.currentTitle) query.current_title = [ctx.input.currentTitle];
    if (ctx.input.currentEmployer) query.current_employer = [ctx.input.currentEmployer];
    if (ctx.input.companyDomain) query.company_domain = [ctx.input.companyDomain];
    if (ctx.input.companyIndustry) query.company_industry = [ctx.input.companyIndustry];
    if (ctx.input.companySize) query.company_size = [ctx.input.companySize];
    if (ctx.input.location) query.location = [ctx.input.location];
    if (ctx.input.skills) query.skills = ctx.input.skills;
    if (ctx.input.department) query.department = [ctx.input.department];
    if (ctx.input.managementLevels) query.management_levels = [ctx.input.managementLevels];
    if (ctx.input.school) query.school = [ctx.input.school];
    if (ctx.input.degree) query.degree = [ctx.input.degree];
    if (ctx.input.major) query.major = [ctx.input.major];
    if (ctx.input.yearsExperience) query.years_experience = ctx.input.yearsExperience;
    if (ctx.input.keyword) query.keyword = [ctx.input.keyword];

    let result = await client.searchPeople({
      query,
      start: ctx.input.start,
      pageSize: ctx.input.pageSize,
      orderBy: ctx.input.orderBy
    });

    let profiles = (result.profiles || result || []).map((p: any) => ({
      profileId: p.id,
      name: p.name,
      currentTitle: p.current_title,
      currentEmployer: p.current_employer,
      currentEmployerDomain: p.current_employer_domain,
      location: p.location,
      linkedinUrl: p.linkedin_url,
      profilePic: p.profile_pic
    }));

    let totalResults = result.pagination?.total ?? result.total ?? undefined;

    return {
      output: {
        profiles,
        pagination: {
          start: ctx.input.start ?? 1,
          pageSize: ctx.input.pageSize ?? 10,
          totalResults
        }
      },
      message: `Found ${profiles.length} matching profiles${totalResults !== undefined ? ` out of ${totalResults} total` : ''}.`
    };
  })
  .build();
