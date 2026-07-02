import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCandidate = SlateTool.create(spec, {
  name: 'Update Candidate',
  key: 'update_candidate',
  description: `Update an existing candidate record. Only provide the fields you want to change. Supports updating contact info, address, employment, skills, and other profile details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.string().describe('ID of the candidate to update'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      middleName: z.string().optional().describe('Middle name'),
      title: z.string().optional().describe('Professional title'),
      currentEmployer: z.string().optional().describe('Current employer name'),
      dateAvailable: z.string().optional().describe('Date available (RFC 3339)'),
      currentPay: z.string().optional().describe('Current pay/salary'),
      desiredPay: z.string().optional().describe('Desired pay/salary'),
      isWillingToRelocate: z.boolean().optional().describe('Willing to relocate'),
      keySkills: z.string().optional().describe('Key skills'),
      notes: z.string().optional().describe('Notes'),
      source: z.string().optional().describe('Candidate source'),
      website: z.string().optional().describe('Website URL'),
      countryCode: z.string().optional().describe('ISO 3166 Alpha-2 country code'),
      ownerId: z.number().optional().describe('Owner/recruiter user ID'),
      isActive: z.boolean().optional().describe('Whether active'),
      isHot: z.boolean().optional().describe('Whether hot'),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional()
        })
        .optional()
        .describe('Address to update')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('ID of the updated candidate'),
      updated: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};

    if (ctx.input.firstName) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName) body.last_name = ctx.input.lastName;
    if (ctx.input.middleName) body.middle_name = ctx.input.middleName;
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.currentEmployer) body.current_employer = ctx.input.currentEmployer;
    if (ctx.input.dateAvailable) body.date_available = ctx.input.dateAvailable;
    if (ctx.input.currentPay) body.current_pay = ctx.input.currentPay;
    if (ctx.input.desiredPay) body.desired_pay = ctx.input.desiredPay;
    if (ctx.input.isWillingToRelocate !== undefined)
      body.is_willing_to_relocate = ctx.input.isWillingToRelocate;
    if (ctx.input.keySkills) body.key_skills = ctx.input.keySkills;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.source) body.source = ctx.input.source;
    if (ctx.input.website) body.website = ctx.input.website;
    if (ctx.input.countryCode) body.country_code = ctx.input.countryCode;
    if (ctx.input.ownerId) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isActive !== undefined) body.is_active = ctx.input.isActive;
    if (ctx.input.isHot !== undefined) body.is_hot = ctx.input.isHot;
    if (ctx.input.address) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode
      };
    }

    await client.updateCandidate(ctx.input.candidateId, body);

    return {
      output: {
        candidateId: ctx.input.candidateId,
        updated: true
      },
      message: `Updated candidate **${ctx.input.candidateId}**.`
    };
  })
  .build();
