import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let phoneSchema = z.object({
  number: z.string().describe('Phone number'),
  extension: z.string().optional().describe('Phone extension'),
  type: z.enum(['home', 'cell', 'work', 'other']).optional().describe('Phone type')
});

let emailSchema = z.object({
  email: z.string().describe('Email address'),
  isPrimary: z.boolean().optional().describe('Whether this is the primary email')
});

let addressSchema = z
  .object({
    street: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State or province'),
    postalCode: z.string().optional().describe('Postal/ZIP code')
  })
  .optional();

export let createCandidate = SlateTool.create(spec, {
  name: 'Create Candidate',
  key: 'create_candidate',
  description: `Create a new candidate record in CATS. Supports setting contact info, address, employment details, skills, availability, and custom fields. Optionally checks for duplicates before creating.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the candidate'),
      lastName: z.string().describe('Last name of the candidate'),
      middleName: z.string().optional().describe('Middle name'),
      title: z.string().optional().describe('Professional title'),
      emails: z.array(emailSchema).optional().describe('Email addresses'),
      phones: z.array(phoneSchema).optional().describe('Phone numbers'),
      address: addressSchema.describe('Mailing address'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 3166 Alpha-2 country code (e.g. US, GB)'),
      website: z.string().optional().describe('Website URL'),
      currentEmployer: z.string().optional().describe('Current employer name'),
      dateAvailable: z.string().optional().describe('Date available to start (RFC 3339)'),
      currentPay: z.string().optional().describe('Current pay/salary'),
      desiredPay: z.string().optional().describe('Desired pay/salary'),
      isWillingToRelocate: z.boolean().optional().describe('Willing to relocate'),
      keySkills: z.string().optional().describe('Key skills (comma-separated or free text)'),
      notes: z.string().optional().describe('Notes about the candidate'),
      source: z.string().optional().describe('Source of the candidate'),
      ownerId: z.number().optional().describe('User ID of the candidate owner/recruiter'),
      isActive: z.boolean().optional().describe('Whether the candidate is active'),
      isHot: z.boolean().optional().describe('Whether to mark the candidate as hot'),
      checkDuplicate: z
        .boolean()
        .optional()
        .describe('Check for duplicate candidates before creating')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('ID of the created candidate'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName
    };

    if (ctx.input.middleName) body.middle_name = ctx.input.middleName;
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.emails) {
      body.emails = ctx.input.emails.map(e => ({
        email: e.email,
        is_primary: e.isPrimary ?? false
      }));
    }
    if (ctx.input.phones) {
      body.phones = ctx.input.phones.map(p => ({
        number: p.number,
        extension: p.extension,
        type: p.type
      }));
    }
    if (ctx.input.address) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode
      };
    }
    if (ctx.input.countryCode) body.country_code = ctx.input.countryCode;
    if (ctx.input.website) body.website = ctx.input.website;
    if (ctx.input.currentEmployer) body.current_employer = ctx.input.currentEmployer;
    if (ctx.input.dateAvailable) body.date_available = ctx.input.dateAvailable;
    if (ctx.input.currentPay) body.current_pay = ctx.input.currentPay;
    if (ctx.input.desiredPay) body.desired_pay = ctx.input.desiredPay;
    if (ctx.input.isWillingToRelocate !== undefined)
      body.is_willing_to_relocate = ctx.input.isWillingToRelocate;
    if (ctx.input.keySkills) body.key_skills = ctx.input.keySkills;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.source) body.source = ctx.input.source;
    if (ctx.input.ownerId) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isActive !== undefined) body.is_active = ctx.input.isActive;
    if (ctx.input.isHot !== undefined) body.is_hot = ctx.input.isHot;

    let result = await client.createCandidate(body, ctx.input.checkDuplicate);

    let candidateId =
      result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';

    return {
      output: {
        candidateId,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName
      },
      message: `Created candidate **${ctx.input.firstName} ${ctx.input.lastName}** (ID: ${candidateId}).`
    };
  })
  .build();
