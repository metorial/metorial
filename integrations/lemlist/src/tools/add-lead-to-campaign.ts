import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, leadOutput, warningOutput } from '../lib/client';
import { spec } from '../spec';

export let addLeadToCampaign = SlateTool.create(spec, {
  name: 'Add Lead to Campaign',
  key: 'add_lead_to_campaign',
  description: `Add a new lead to a specific campaign. Supports setting lead details like name, email, company, job title, LinkedIn URL, and phone. Optionally enable deduplication, enrichment, email finding, and verification.`,
  instructions: [
    'The email field is typically required but can be omitted if findEmail enrichment is enabled.',
    'Custom variables can be passed as additional key-value pairs in customVariables; they cannot replace standard lead fields or request options.',
    'This creates a campaign lead and can create or update a global contact and company. Company fields affect shared company records. It never updates an existing campaign lead.',
    'Enrichment options can spend credits, and a campaign with automatic review may launch the new lead immediately. Provider warnings describe fields left unchanged or company writes skipped.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign to add the lead to'),
      email: z.string().optional().describe('Lead email address'),
      firstName: z.string().optional().describe('Lead first name'),
      lastName: z.string().optional().describe('Lead last name'),
      companyName: z.string().optional().describe('Lead company name'),
      jobTitle: z.string().optional().describe('Lead job title'),
      linkedinUrl: z.string().optional().describe('Lead LinkedIn profile URL'),
      phone: z.string().optional().describe('Lead phone number'),
      companyDomain: z.string().optional().describe('Lead company domain'),
      icebreaker: z.string().optional().describe('Personalized opening line for the lead'),
      picture: z.string().optional().describe('Lead profile picture URL'),
      deduplicate: z
        .boolean()
        .optional()
        .describe('Check if lead email exists in other campaigns before adding'),
      findEmail: z
        .boolean()
        .optional()
        .describe('Automatically find the lead email address (uses credits)'),
      verifyEmail: z
        .boolean()
        .optional()
        .describe('Verify the lead email address (uses credits)'),
      findPhone: z
        .boolean()
        .optional()
        .describe('Automatically find the lead phone number (uses credits)'),
      linkedinEnrichment: z
        .boolean()
        .optional()
        .describe('Enrich lead data from LinkedIn (uses credits)'),
      customVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional custom variables as key-value pairs')
    })
  )
  .output(
    z.object({
      leadId: z.string(),
      campaignId: z.string().optional(),
      campaignName: z.string().optional(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      companyName: z.string().optional(),
      isPaused: z.boolean().optional(),
      contactId: z.string().optional(),
      warnings: z
        .array(z.object({ code: z.string().optional(), message: z.string().optional() }))
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const {
      campaignId,
      deduplicate,
      findEmail,
      verifyEmail,
      findPhone,
      linkedinEnrichment,
      customVariables,
      ...leadData
    } = ctx.input;
    const reserved = new Set([
      'campaignId',
      'email',
      'firstName',
      'lastName',
      'companyName',
      'jobTitle',
      'linkedinUrl',
      'phone',
      'companyDomain',
      'timezone',
      'contactOwner',
      'icebreaker',
      'picture',
      '_id',
      'contactId',
      'deduplicate',
      'findEmail',
      'verifyEmail',
      'findPhone',
      'linkedinEnrichment',
      '__proto__',
      'constructor',
      'prototype'
    ]);
    for (const key of Object.keys(customVariables ?? {}))
      if (!key.trim() || reserved.has(key))
        throw createApiServiceError(
          'Custom variables cannot replace standard lead fields or request options.'
        );
    if (
      !leadData.email?.trim() &&
      !leadData.linkedinUrl?.trim() &&
      !leadData.phone?.trim() &&
      !findEmail
    )
      throw createApiServiceError(
        'Provide an email, LinkedIn URL, phone number, or email-finding inputs.'
      );
    const result = await client.addLeadToCampaign(
      campaignId,
      { ...leadData, ...customVariables },
      { deduplicate, findEmail, verifyEmail, findPhone, linkedinEnrichment }
    );
    const mapped = leadOutput(result);
    return {
      output: {
        leadId: mapped.leadId,
        campaignId: mapped.campaignId,
        campaignName: mapped.campaignName,
        email: mapped.email,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        companyName: mapped.companyName,
        isPaused: mapped.isPaused,
        contactId: mapped.contactId,
        warnings: warningOutput(result.warnings)
      },
      message: `Created lead \`${mapped.leadId}\`. Review any provider warnings and the campaign's automatic launch settings.`
    };
  })
  .build();
