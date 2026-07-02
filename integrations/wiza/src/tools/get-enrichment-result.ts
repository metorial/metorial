import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailSchema = z.object({
  email: z.string().describe('Email address'),
  emailType: z.string().describe('Type of email (e.g., "work", "personal")'),
  emailStatus: z.string().describe('Verification status (e.g., "valid", "risky", "invalid")')
});

let phoneSchema = z.object({
  phoneNumber: z.string().describe('Phone number'),
  phoneType: z.string().describe('Type of phone (e.g., "mobile")')
});

export let getEnrichmentResult = SlateTool.create(spec, {
  name: 'Get Enrichment Result',
  key: 'get_enrichment_result',
  description: `Retrieve the results of a previously started contact enrichment request. Returns the full enrichment data including verified emails, phone numbers, LinkedIn profile details, and company information.

Use the revealId from the **Enrich Contact** tool to check progress and retrieve results.`,
  instructions: [
    'If status is not "finished", the enrichment is still processing. Wait and try again.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      revealId: z
        .number()
        .describe('The ID of the enrichment request returned by Enrich Contact.')
    })
  )
  .output(
    z.object({
      revealId: z.number().describe('Unique ID of the enrichment request.'),
      status: z
        .string()
        .describe('Current status: "queued", "resolving", "finished", or "failed".'),
      isComplete: z.boolean().describe('Whether the enrichment has completed processing.'),
      failError: z.string().optional().describe('Error message if the enrichment failed.'),
      name: z.string().optional().describe('Full name of the contact.'),
      title: z.string().optional().describe('Job title of the contact.'),
      headline: z.string().optional().describe('LinkedIn headline.'),
      bio: z.string().optional().describe('LinkedIn bio/summary.'),
      location: z.string().optional().describe('Location of the contact.'),
      linkedinProfileUrl: z.string().optional().describe('LinkedIn profile URL.'),
      enrichmentLevel: z.string().optional().describe('The enrichment level used.'),
      primaryEmail: z.string().optional().describe('Primary email address found.'),
      primaryEmailType: z.string().optional().describe('Type of the primary email.'),
      primaryEmailStatus: z
        .string()
        .optional()
        .describe('Verification status of the primary email.'),
      emails: z.array(emailSchema).optional().describe('All email addresses found.'),
      primaryPhone: z.string().optional().describe('Primary phone number found.'),
      phones: z.array(phoneSchema).optional().describe('All phone numbers found.'),
      companyName: z.string().optional().describe('Company name.'),
      companyDomain: z.string().optional().describe('Company domain.'),
      companyLinkedin: z.string().optional().describe('Company LinkedIn URL.'),
      companyIndustry: z.string().optional().describe('Company industry.'),
      companySubindustry: z.string().optional().describe('Company sub-industry.'),
      companySize: z.number().optional().describe('Company headcount.'),
      companySizeRange: z.string().optional().describe('Company headcount range.'),
      companyType: z.string().optional().describe('Company type (e.g., "public", "private").'),
      companyLocation: z.string().optional().describe('Company headquarters location.'),
      companyFounded: z.number().optional().describe('Company founding year.'),
      companyRevenue: z.string().optional().describe('Company revenue range.'),
      companyFunding: z.string().optional().describe('Total funding amount.'),
      isPremium: z
        .boolean()
        .optional()
        .describe('Whether the contact has a LinkedIn Premium account.'),
      isOpenToWork: z
        .boolean()
        .optional()
        .describe('Whether the contact is open to work on LinkedIn.'),
      tenureAtCompany: z
        .string()
        .optional()
        .describe('How long the contact has been at their current company.'),
      tenureAtRole: z
        .string()
        .optional()
        .describe('How long the contact has been in their current role.'),
      skills: z.array(z.string()).optional().describe('Listed skills from LinkedIn.'),
      languages: z.array(z.string()).optional().describe('Languages from LinkedIn profile.'),
      workHistory: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Work experience history.'),
      education: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Education history.'),
      certifications: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Certifications from LinkedIn.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getIndividualReveal(ctx.input.revealId);
    let d = result.data;

    ctx.info({
      message: 'Retrieved enrichment result',
      revealId: d.id,
      status: d.status,
      isComplete: d.is_complete
    });

    let emails = d.emails?.map(e => ({
      email: e.email,
      emailType: e.email_type,
      emailStatus: e.email_status
    }));

    let phones = d.phones?.map(p => ({
      phoneNumber: p.phone_number,
      phoneType: p.phone_type
    }));

    let output = {
      revealId: d.id,
      status: d.status,
      isComplete: d.is_complete,
      failError: d.fail_error,
      name: d.name,
      title: d.title,
      headline: d.headline,
      bio: d.bio,
      location: d.location,
      linkedinProfileUrl: d.linkedin_profile_url,
      enrichmentLevel: d.enrichment_level,
      primaryEmail: d.email,
      primaryEmailType: d.email_type,
      primaryEmailStatus: d.email_status,
      emails,
      primaryPhone: d.mobile_phone || d.phone_number,
      phones,
      companyName: d.company,
      companyDomain: d.company_domain,
      companyLinkedin: d.company_linkedin,
      companyIndustry: d.company_industry,
      companySubindustry: d.company_subindustry,
      companySize: d.company_size,
      companySizeRange: d.company_size_range,
      companyType: d.company_type,
      companyLocation: d.company_location,
      companyFounded: d.company_founded,
      companyRevenue: d.company_revenue,
      companyFunding: d.company_funding,
      isPremium: d.is_premium,
      isOpenToWork: d.is_open_to_work,
      tenureAtCompany: d.tenure_at_company,
      tenureAtRole: d.tenure_at_role,
      skills: d.skills,
      languages: d.languages,
      workHistory: d.work_history,
      education: d.education,
      certifications: d.certifications
    };

    if (d.status === 'failed') {
      return {
        output,
        message: `Enrichment **${d.id}** failed: ${d.fail_error || 'Unknown error'}.`
      };
    }

    if (!d.is_complete) {
      return {
        output,
        message: `Enrichment **${d.id}** is still processing (status: **${d.status}**). Try again shortly.`
      };
    }

    let parts = [`Enrichment **${d.id}** completed for **${d.name || 'unknown contact'}**`];
    if (d.title) parts.push(`Title: ${d.title}`);
    if (d.email) parts.push(`Email: ${d.email} (${d.email_status})`);
    if (d.mobile_phone || d.phone_number)
      parts.push(`Phone: ${d.mobile_phone || d.phone_number}`);
    if (d.company) parts.push(`Company: ${d.company}`);

    return {
      output,
      message: parts.join('\n')
    };
  })
  .build();
