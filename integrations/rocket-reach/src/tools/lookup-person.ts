import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailSchema = z.object({
  email: z.string().optional().describe('Email address'),
  smtpValid: z.string().nullable().optional().describe('SMTP validation status'),
  type: z.string().nullable().optional().describe('Email type (professional, personal, etc.)'),
  grade: z.string().nullable().optional().describe('RocketReach quality grade (A, A-, B)'),
  lastValidationCheck: z
    .string()
    .nullable()
    .optional()
    .describe('Timestamp of last validation')
});

let phoneSchema = z.object({
  number: z.string().optional().describe('Phone number'),
  type: z.string().nullable().optional().describe('Phone type (mobile, work, etc.)'),
  validity: z.string().nullable().optional().describe('Validity status'),
  recommended: z.boolean().optional().describe('Whether this is the recommended number'),
  premium: z.boolean().optional().describe('Whether this is a premium phone number')
});

let jobHistorySchema = z.object({
  title: z.string().nullable().optional().describe('Job title'),
  companyName: z.string().nullable().optional().describe('Company name'),
  companyDomain: z.string().nullable().optional().describe('Company domain'),
  startDate: z.string().nullable().optional().describe('Start date'),
  endDate: z.string().nullable().optional().describe('End date'),
  isCurrent: z.boolean().optional().describe('Whether this is the current position'),
  department: z.string().nullable().optional().describe('Department')
});

let educationSchema = z.object({
  school: z.string().nullable().optional().describe('School name'),
  degree: z.string().nullable().optional().describe('Degree type'),
  major: z.string().nullable().optional().describe('Major or field of study'),
  startYear: z.number().nullable().optional().describe('Start year'),
  endYear: z.number().nullable().optional().describe('End year')
});

export let lookupPerson = SlateTool.create(spec, {
  name: 'Lookup Person',
  key: 'lookup_person',
  description: `Retrieve full contact details for a person including verified email addresses, phone numbers, social links, job history, and education. Identify the person using their name + employer, LinkedIn URL, email, or a RocketReach profile ID.

This is the primary tool for **contact enrichment** — use it after searching for people to get their contact information.`,
  instructions: [
    'Provide at least one identifier: name + currentEmployer, linkedinUrl, email, or profileId.',
    'Using a LinkedIn URL or profileId typically returns faster and more accurate results.',
    'If the lookup status is "searching" or "progress", the lookup is still processing. Use Check Lookup Status to poll for completion.'
  ],
  constraints: [
    'Lookup credits are deducted only when contact information is successfully retrieved.',
    'Results may take time to process — check the status field in the response.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z
        .string()
        .optional()
        .describe('Full name of the person. Must be used together with currentEmployer.'),
      currentEmployer: z
        .string()
        .optional()
        .describe('Current employer of the person. Must be used together with name.'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL for direct lookup'),
      profileId: z
        .number()
        .optional()
        .describe('RocketReach profile ID from a previous search'),
      email: z.string().optional().describe('Email address for the desired profile'),
      title: z.string().optional().describe('Job title to help disambiguate results')
    })
  )
  .output(
    z.object({
      profileId: z.number().optional().describe('RocketReach internal profile ID'),
      status: z
        .string()
        .optional()
        .describe('Lookup status: complete, progress, searching, or not queued'),
      name: z.string().nullable().optional().describe('Full name'),
      currentTitle: z.string().nullable().optional().describe('Current job title'),
      currentEmployer: z.string().nullable().optional().describe('Current employer'),
      currentEmployerDomain: z
        .string()
        .nullable()
        .optional()
        .describe('Current employer domain'),
      currentEmployerIndustry: z
        .string()
        .nullable()
        .optional()
        .describe('Current employer industry'),
      location: z.string().nullable().optional().describe('Geographic location'),
      city: z.string().nullable().optional().describe('City'),
      region: z.string().nullable().optional().describe('Region or state'),
      countryCode: z.string().nullable().optional().describe('Country code'),
      linkedinUrl: z.string().nullable().optional().describe('LinkedIn profile URL'),
      profilePic: z.string().nullable().optional().describe('Profile picture URL'),
      recommendedEmail: z
        .string()
        .nullable()
        .optional()
        .describe('Best recommended email address'),
      recommendedProfessionalEmail: z
        .string()
        .nullable()
        .optional()
        .describe('Recommended professional email'),
      recommendedPersonalEmail: z
        .string()
        .nullable()
        .optional()
        .describe('Recommended personal email'),
      emails: z
        .array(emailSchema)
        .optional()
        .describe('All known email addresses with validation details'),
      phones: z.array(phoneSchema).optional().describe('All known phone numbers'),
      skills: z.array(z.string()).nullable().optional().describe('Professional skills'),
      jobHistory: z.array(jobHistorySchema).optional().describe('Work experience history'),
      education: z.array(educationSchema).optional().describe('Educational background'),
      links: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Social media and other profile links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.lookupPerson({
      name: ctx.input.name,
      currentEmployer: ctx.input.currentEmployer,
      linkedinUrl: ctx.input.linkedinUrl,
      profileId: ctx.input.profileId,
      email: ctx.input.email,
      title: ctx.input.title
    });

    let emails = (result.emails || []).map((e: any) => ({
      email: e.email,
      smtpValid: e.smtp_valid,
      type: e.type,
      grade: e.grade,
      lastValidationCheck: e.last_validation_check
    }));

    let phones = (result.phones || []).map((p: any) => ({
      number: p.number,
      type: p.type,
      validity: p.validity,
      recommended: p.recommended,
      premium: p.premium
    }));

    let jobHistory = (result.job_history || []).map((j: any) => ({
      title: j.title,
      companyName: j.company_name,
      companyDomain: j.company_domain,
      startDate: j.start_date,
      endDate: j.end_date,
      isCurrent: j.is_current,
      department: j.department
    }));

    let education = (result.education || []).map((e: any) => ({
      school: e.school,
      degree: e.degree,
      major: e.major,
      startYear: e.start,
      endYear: e.end
    }));

    let output = {
      profileId: result.id,
      status: result.status,
      name: result.name,
      currentTitle: result.current_title,
      currentEmployer: result.current_employer,
      currentEmployerDomain: result.current_employer_domain,
      currentEmployerIndustry: result.current_employer_industry,
      location: result.location,
      city: result.city,
      region: result.region,
      countryCode: result.country_code,
      linkedinUrl: result.linkedin_url,
      profilePic: result.profile_pic,
      recommendedEmail: result.recommended_email,
      recommendedProfessionalEmail: result.recommended_professional_email,
      recommendedPersonalEmail: result.recommended_personal_email,
      emails,
      phones,
      skills: result.skills,
      jobHistory,
      education,
      links: result.links
    };

    let statusMessage =
      result.status === 'complete'
        ? `Successfully retrieved contact details for **${result.name || 'the requested profile'}**.`
        : `Lookup is **${result.status}**. The lookup may still be processing — use Check Lookup Status to check again later.`;

    let emailCount = emails.length;
    let phoneCount = phones.length;
    let contactSummary =
      result.status === 'complete'
        ? ` Found ${emailCount} email(s) and ${phoneCount} phone number(s).`
        : '';

    return {
      output,
      message: statusMessage + contactSummary
    };
  })
  .build();
