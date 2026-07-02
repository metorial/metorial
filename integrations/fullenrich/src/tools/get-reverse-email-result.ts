import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  country: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional()
});

let employmentSchema = z.object({
  title: z.string().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  companyIndustry: z.string().optional(),
  isCurrent: z.boolean().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional()
});

let personProfileSchema = z.object({
  personId: z.string().optional(),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  location: locationSchema.optional(),
  linkedinUrl: z.string().optional(),
  skills: z.array(z.string()).optional(),
  currentEmployment: employmentSchema.optional(),
  allEmployment: z.array(employmentSchema).optional()
});

let reverseEmailRecordSchema = z.object({
  email: z.string().optional().describe('The input email address'),
  custom: z.record(z.string(), z.string()).optional().describe('Custom tracking fields'),
  profile: personProfileSchema.optional().describe('Person profile found for this email')
});

export let getReverseEmailResult = SlateTool.create(spec, {
  name: 'Get Reverse Email Result',
  key: 'get_reverse_email_result',
  description: `Retrieve results of a previously started reverse email lookup. Returns person profiles (name, job title, location, work history, skills) and company details for each email looked up.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      enrichmentId: z
        .string()
        .describe('The enrichment ID returned from the reverse email lookup request')
    })
  )
  .output(
    z.object({
      enrichmentId: z.string().describe('Lookup batch ID'),
      name: z.string().optional().describe('Batch name'),
      status: z
        .enum([
          'CREATED',
          'IN_PROGRESS',
          'CANCELED',
          'CREDITS_INSUFFICIENT',
          'FINISHED',
          'RATE_LIMIT',
          'UNKNOWN'
        ])
        .describe('Current lookup status'),
      records: z.array(reverseEmailRecordSchema).describe('Lookup results per email'),
      creditsUsed: z.number().optional().describe('Credits consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getReverseEmailResult(ctx.input.enrichmentId);

    let mapEmployment = (emp: any) => {
      if (!emp) return undefined;
      return {
        title: emp.title,
        companyName: emp.company?.name,
        companyDomain: emp.company?.domain,
        companyIndustry: emp.company?.industry?.main_industry,
        isCurrent: emp.is_current,
        startAt: emp.start_at,
        endAt: emp.end_at
      };
    };

    let records = (result.data ?? []).map((entry: any) => {
      let profile = entry.profile;
      return {
        email: entry.input?.email,
        custom: entry.custom,
        profile: profile
          ? {
              personId: profile.id,
              fullName: profile.full_name,
              firstName: profile.first_name,
              lastName: profile.last_name,
              location: profile.location
                ? {
                    country: profile.location.country,
                    countryCode: profile.location.country_code,
                    city: profile.location.city,
                    region: profile.location.region
                  }
                : undefined,
              linkedinUrl: profile.social_profiles?.linkedin?.url,
              skills: profile.skills,
              currentEmployment: profile.employment?.current
                ? mapEmployment(profile.employment.current)
                : undefined,
              allEmployment: profile.employment?.all?.map(mapEmployment)
            }
          : undefined
      };
    });

    let output = {
      enrichmentId: result.id,
      name: result.name,
      status: result.status,
      records,
      creditsUsed: result.cost?.credits
    };

    let found = records.filter((r: any) => r.profile).length;

    return {
      output,
      message: `Reverse email lookup **"${result.name}"** — Status: **${result.status}**. ${records.length} email(s) processed, ${found} person profile(s) found. Credits used: ${result.cost?.credits ?? 0}.`
    };
  })
  .build();
