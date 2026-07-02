import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let emailSchema = z.object({
  email: z.string().optional().describe('Email address'),
  smtpValid: z.string().nullable().optional().describe('SMTP validation status'),
  type: z.string().nullable().optional().describe('Email type'),
  grade: z.string().nullable().optional().describe('Quality grade')
});

let phoneSchema = z.object({
  number: z.string().optional().describe('Phone number'),
  type: z.string().nullable().optional().describe('Phone type'),
  validity: z.string().nullable().optional().describe('Validity status')
});

export let lookupCompleted = SlateTrigger.create(spec, {
  name: 'Lookup Completed',
  key: 'lookup_completed',
  description:
    'Triggers when a person lookup or bulk lookup completes and RocketReach sends results via webhook. Configure the webhook callback URL in your RocketReach API settings.'
})
  .input(
    z.object({
      profileId: z.number().describe('RocketReach profile ID'),
      status: z.string().describe('Lookup status (complete, failed, etc.)'),
      name: z.string().nullable().optional().describe('Full name'),
      currentTitle: z.string().nullable().optional().describe('Current job title'),
      currentEmployer: z.string().nullable().optional().describe('Current employer'),
      linkedinUrl: z.string().nullable().optional().describe('LinkedIn URL'),
      recommendedEmail: z.string().nullable().optional().describe('Recommended email'),
      emails: z.array(emailSchema).optional().describe('Email addresses'),
      phones: z.array(phoneSchema).optional().describe('Phone numbers'),
      raw: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      profileId: z.number().describe('RocketReach profile ID'),
      status: z.string().describe('Lookup status'),
      name: z.string().nullable().optional().describe('Full name'),
      currentTitle: z.string().nullable().optional().describe('Current job title'),
      currentEmployer: z.string().nullable().optional().describe('Current employer'),
      currentEmployerDomain: z
        .string()
        .nullable()
        .optional()
        .describe('Current employer domain'),
      location: z.string().nullable().optional().describe('Geographic location'),
      linkedinUrl: z.string().nullable().optional().describe('LinkedIn URL'),
      recommendedEmail: z.string().nullable().optional().describe('Best recommended email'),
      emails: z.array(emailSchema).optional().describe('All email addresses'),
      phones: z.array(phoneSchema).optional().describe('All phone numbers'),
      skills: z.array(z.string()).nullable().optional().describe('Professional skills')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // RocketReach webhook can send individual profile or array of profiles (for bulk lookups)
      let profiles = Array.isArray(data) ? data : [data];

      let inputs = profiles.map((p: any) => ({
        profileId: p.id,
        status: p.status,
        name: p.name,
        currentTitle: p.current_title,
        currentEmployer: p.current_employer,
        linkedinUrl: p.linkedin_url,
        recommendedEmail: p.recommended_email,
        emails: (p.emails || []).map((e: any) => ({
          email: e.email,
          smtpValid: e.smtp_valid,
          type: e.type,
          grade: e.grade
        })),
        phones: (p.phones || []).map((ph: any) => ({
          number: ph.number,
          type: ph.type,
          validity: ph.validity
        })),
        raw: p
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let raw = input.raw || {};

      return {
        type: `person.lookup_${input.status === 'complete' ? 'completed' : input.status}`,
        id: `lookup_${input.profileId}_${Date.now()}`,
        output: {
          profileId: input.profileId,
          status: input.status,
          name: input.name,
          currentTitle: input.currentTitle,
          currentEmployer: input.currentEmployer,
          currentEmployerDomain: raw.current_employer_domain ?? null,
          location: raw.location ?? null,
          linkedinUrl: input.linkedinUrl,
          recommendedEmail: input.recommendedEmail,
          emails: input.emails ?? [],
          phones: input.phones ?? [],
          skills: raw.skills ?? null
        }
      };
    }
  })
  .build();
