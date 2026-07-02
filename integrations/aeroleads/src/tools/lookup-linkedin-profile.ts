import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupLinkedInProfile = SlateTool.create(spec, {
  name: 'Lookup LinkedIn Profile',
  key: 'lookup_linkedin_profile',
  description: `Retrieve detailed profile information for a LinkedIn user. Provide a LinkedIn profile URL to get the person's name, job title, current company, previous companies, education, skills, verified emails, and phone numbers.`,
  constraints: ['Each API call consumes 1 credit from your AeroLeads account.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkedinUrl: z
        .string()
        .describe(
          'The LinkedIn profile URL of the prospect (e.g. "linkedin.com/in/johndoe" or "https://www.linkedin.com/in/johndoe").'
        )
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Full name of the prospect.'),
      firstName: z.string().optional().describe('First name of the prospect.'),
      lastName: z.string().optional().describe('Last name of the prospect.'),
      jobTitle: z.string().optional().describe('Current job title.'),
      currentCompany: z.string().optional().describe('Current company name.'),
      location: z.string().optional().describe('Location of the prospect.'),
      emails: z.array(z.string()).optional().describe('List of verified email addresses.'),
      phoneNumbers: z.array(z.string()).optional().describe('List of phone numbers.'),
      previousCompanies: z
        .array(z.string())
        .optional()
        .describe('List of previous company names.'),
      education: z.array(z.string()).optional().describe('List of educational institutions.'),
      skills: z.array(z.string()).optional().describe('List of skills.'),
      linkedinUrl: z.string().optional().describe('The LinkedIn profile URL.'),
      rawResponse: z
        .any()
        .optional()
        .describe('Full raw response from the API for additional fields.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLinkedInDetails(ctx.input.linkedinUrl);

    let name = result.name || result.full_name || undefined;
    let firstName = result.first_name || undefined;
    let lastName = result.last_name || undefined;
    let jobTitle = result.title || result.job_title || undefined;
    let currentCompany = result.company || result.current_company || undefined;
    let location = result.location || undefined;

    let emails: string[] = [];
    if (Array.isArray(result.emails)) {
      emails = result.emails;
    } else if (result.email) {
      emails = Array.isArray(result.email) ? result.email : [result.email];
    }

    let phoneNumbers: string[] = [];
    if (Array.isArray(result.phone_numbers)) {
      phoneNumbers = result.phone_numbers;
    } else if (result.phone) {
      phoneNumbers = Array.isArray(result.phone) ? result.phone : [result.phone];
    }

    let previousCompanies: string[] = [];
    if (Array.isArray(result.previous_companies)) {
      previousCompanies = result.previous_companies;
    }

    let education: string[] = [];
    if (Array.isArray(result.education)) {
      education = result.education;
    }

    let skills: string[] = [];
    if (Array.isArray(result.skills)) {
      skills = result.skills;
    }

    let output = {
      name,
      firstName,
      lastName,
      jobTitle,
      currentCompany,
      location,
      emails: emails.length > 0 ? emails : undefined,
      phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
      previousCompanies: previousCompanies.length > 0 ? previousCompanies : undefined,
      education: education.length > 0 ? education : undefined,
      skills: skills.length > 0 ? skills : undefined,
      linkedinUrl: ctx.input.linkedinUrl,
      rawResponse: result
    };

    let messageParts = [`**${name || 'Profile'}**`];
    if (jobTitle) messageParts.push(`${jobTitle}`);
    if (currentCompany) messageParts.push(`at ${currentCompany}`);
    if (emails && emails.length > 0) messageParts.push(`\nEmails: ${emails.join(', ')}`);
    if (phoneNumbers && phoneNumbers.length > 0)
      messageParts.push(`\nPhone: ${phoneNumbers.join(', ')}`);

    return {
      output,
      message: messageParts.join(' ')
    };
  })
  .build();
