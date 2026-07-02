import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let leadSaved = SlateTrigger.create(spec, {
  name: 'Lead Saved',
  key: 'lead_saved',
  description:
    'Triggered when a lead is saved in Tomba. Receives lead details including email, company, name, position, phone, social profiles, and score.'
})
  .input(
    z.object({
      email: z.string().nullable().optional().describe('Lead email address'),
      company: z.string().nullable().optional().describe('Company name'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      phone: z.string().nullable().optional().describe('Phone number'),
      website: z.string().nullable().optional().describe('Website URL'),
      position: z.string().nullable().optional().describe('Job position'),
      twitter: z.string().nullable().optional().describe('Twitter handle'),
      linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
      notes: z.string().nullable().optional().describe('Notes'),
      score: z.number().nullable().optional().describe('Lead score')
    })
  )
  .output(
    z.object({
      email: z.string().nullable().optional().describe('Lead email address'),
      company: z.string().nullable().optional().describe('Company name'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      phone: z.string().nullable().optional().describe('Phone number'),
      website: z.string().nullable().optional().describe('Website URL'),
      position: z.string().nullable().optional().describe('Job position'),
      twitter: z.string().nullable().optional().describe('Twitter handle'),
      linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
      notes: z.string().nullable().optional().describe('Notes'),
      score: z.number().nullable().optional().describe('Lead score')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let lead = body.data || body;

      return {
        inputs: [
          {
            email: lead.email,
            company: lead.company,
            firstName: lead.first_name || lead.firstName,
            lastName: lead.last_name || lead.lastName,
            phone: lead.phone || lead.phone_number,
            website: lead.website || lead.website_url,
            position: lead.position,
            twitter: lead.twitter,
            linkedin: lead.linkedin,
            notes: lead.notes,
            score: lead.score
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let uniqueId = ctx.input.email || `lead-${Date.now()}`;

      return {
        type: 'lead.saved',
        id: uniqueId,
        output: {
          email: ctx.input.email,
          company: ctx.input.company,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          phone: ctx.input.phone,
          website: ctx.input.website,
          position: ctx.input.position,
          twitter: ctx.input.twitter,
          linkedin: ctx.input.linkedin,
          notes: ctx.input.notes,
          score: ctx.input.score
        }
      };
    }
  })
  .build();
