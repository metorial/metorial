import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getResult, getStringList, getText } from '../lib/response';
import { spec } from '../spec';

export let lookupLinkedInProfile = SlateTool.create(spec, {
  name: 'Lookup LinkedIn Profile',
  key: 'lookup_linkedin_profile',
  description:
    'Look up a prospect by LinkedIn profile URL. Returns available names, job and company details, location, education, skills, email addresses, and phone numbers.',
  constraints: ['Lookups may consume credits from your AeroLeads account.'],
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
      companyWebsite: z.string().optional().describe('Current company website.'),
      companyLinkedinUrl: z.string().optional().describe('Current company LinkedIn URL.'),
      location: z.string().optional().describe('Location of the prospect.'),
      city: z.string().optional().describe('City of the prospect.'),
      country: z.string().optional().describe('Country of the prospect.'),
      industry: z.string().optional().describe('Industry of the prospect.'),
      profilePictureUrl: z.string().optional().describe('Profile picture URL.'),
      emails: z.array(z.string()).optional().describe('Available email addresses.'),
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

    let response = await client.getLinkedInDetails(ctx.input.linkedinUrl);
    let result = getResult(response);

    let firstName = getText(result.first_name);
    let lastName = getText(result.last_name);
    let name =
      getText(result.name, result.full_name) ??
      getText([firstName, lastName].filter(Boolean).join(' '));
    let jobTitle = getText(result.title, result.job_title, result.job_title_role);
    let currentCompany = getText(
      result.company,
      result.current_company,
      result.job_company_name
    );
    let city = getText(result.city);
    let country = getText(result.country);
    let location =
      getText(result.location, result.address) ??
      getText([city, country].filter(Boolean).join(', '));

    let emails = getStringList(result.emails, result.email, result.emails_s2);
    let phoneNumbers = getStringList(
      result.phone_numbers,
      result.phone,
      result.phone_numbers_s2
    );

    let output = {
      name,
      firstName,
      lastName,
      jobTitle,
      currentCompany,
      companyWebsite: getText(result.job_company_website),
      companyLinkedinUrl: getText(result.job_company_linkedin_url),
      location,
      city,
      country,
      industry: getText(result.industry),
      profilePictureUrl: getText(result.profile_picture_url),
      emails,
      phoneNumbers,
      previousCompanies: getStringList(result.previous_companies),
      education: getStringList(result.education),
      skills: getStringList(result.skills),
      linkedinUrl: ctx.input.linkedinUrl,
      rawResponse: response
    };

    let messageParts = [`**${name || 'Profile'}**`];
    if (jobTitle) messageParts.push(`${jobTitle}`);
    if (currentCompany) messageParts.push(`at ${currentCompany}`);
    if (emails) messageParts.push(`\nEmails: ${emails.join(', ')}`);
    if (phoneNumbers) messageParts.push(`\nPhone: ${phoneNumbers.join(', ')}`);

    return {
      output,
      message: messageParts.join(' ')
    };
  })
  .build();
