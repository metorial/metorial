import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { leadNumber, leadString, readLeadBoxerRecord } from '../lib/responses';
import { datasetIdSchema, getLegacyDatasetId } from '../lib/schemas';
import { spec } from '../spec';

export let emailLookup = SlateTool.create(spec, {
  name: 'Email Lookup',
  key: 'email_lookup',
  description:
    'Enrich a work email with the contact’s professional profile, LinkedIn URL, seniority, job function, languages, and work experience. Optional name and company hints improve matching. A successful match costs 50 credits; unsuccessful matches are not charged.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z
        .string()
        .email()
        .max(254)
        .describe('Work email address of the contact to enrich'),
      firstName: z.string().max(100).optional().describe('Optional first-name matching hint'),
      lastName: z.string().max(100).optional().describe('Optional last-name matching hint'),
      companyName: z
        .string()
        .max(200)
        .optional()
        .describe('Optional employer-name matching hint'),
      companyDomain: z
        .string()
        .max(253)
        .optional()
        .describe('Optional employer-domain matching hint'),
      datasetId: datasetIdSchema
    })
  )
  .output(
    z.object({
      email: z.string().optional(),
      fullName: z.string().optional(),
      headline: z.string().optional(),
      linkedinUrl: z.string().optional(),
      seniority: z.string().optional(),
      jobFunction: z.string().optional(),
      location: z.string().optional(),
      languages: z
        .array(z.object({ name: z.string().optional(), proficiency: z.string().optional() }))
        .optional(),
      experience: z
        .array(
          z.object({
            title: z.string().optional(),
            companyName: z.string().optional(),
            startYear: z.number().optional(),
            endYear: z.number().optional(),
            current: z.boolean().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.input.datasetId ?? getLegacyDatasetId(ctx.config)
    });
    let profile = await client.lookupEmail({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      companyName: ctx.input.companyName,
      companyDomain: ctx.input.companyDomain
    });
    let output = {
      email: leadString(profile.email),
      fullName: leadString(profile.fullName),
      headline: leadString(profile.headline),
      linkedinUrl: leadString(profile.linkedinUrl),
      seniority: leadString(profile.seniority),
      jobFunction: leadString(profile.jobFunction),
      location: leadString(profile.location),
      languages: Array.isArray(profile.languages)
        ? profile.languages.map(value => {
            let language = readLeadBoxerRecord(value, 'contact language');
            return {
              name: leadString(language.name),
              proficiency: leadString(language.proficiency)
            };
          })
        : undefined,
      experience: Array.isArray(profile.experience)
        ? profile.experience.map(value => {
            let experience = readLeadBoxerRecord(value, 'contact experience');
            return {
              title: leadString(experience.title),
              companyName: leadString(experience.companyName),
              startYear: leadNumber(experience.startYear),
              endYear: leadNumber(experience.endYear),
              current: typeof experience.current === 'boolean' ? experience.current : undefined
            };
          })
        : undefined
    };
    return {
      output,
      message: `Retrieved professional profile for **${output.fullName || ctx.input.email}**.`
    };
  })
  .build();
