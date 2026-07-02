import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString } from '../lib/output';
import { spec } from '../spec';

export let getMyProfile = SlateTool.create(spec, {
  name: 'Get My Profile',
  key: 'get_my_profile',
  description: `Retrieve the authenticated Outlook user's Microsoft Graph profile, including name, email address, job title, phone numbers, office location, and preferred language.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Microsoft Graph user ID'),
      displayName: z.string().optional().describe('Display name of the authenticated user'),
      givenName: z.string().optional().describe('Given name of the authenticated user'),
      surname: z.string().optional().describe('Surname of the authenticated user'),
      email: z
        .string()
        .optional()
        .describe(
          'Primary email address, using mail when available and userPrincipalName otherwise'
        ),
      mail: z.string().optional().describe('Mailbox email address from Microsoft Graph'),
      userPrincipalName: z.string().optional().describe('Microsoft Entra user principal name'),
      jobTitle: z.string().optional().describe('Job title of the authenticated user'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      businessPhones: z.array(z.string()).optional().describe('Business phone numbers'),
      officeLocation: z.string().optional().describe('Office location'),
      preferredLanguage: z.string().optional().describe('Preferred language')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let profile = await client.getMyProfile();
    let mail = optionalString(profile.mail);
    let userPrincipalName = optionalString(profile.userPrincipalName);
    let email = mail ?? userPrincipalName;

    return {
      output: {
        userId: profile.id,
        displayName: optionalString(profile.displayName),
        givenName: optionalString(profile.givenName),
        surname: optionalString(profile.surname),
        email,
        mail,
        userPrincipalName,
        jobTitle: optionalString(profile.jobTitle),
        mobilePhone: optionalString(profile.mobilePhone),
        businessPhones: Array.isArray(profile.businessPhones)
          ? profile.businessPhones
          : undefined,
        officeLocation: optionalString(profile.officeLocation),
        preferredLanguage: optionalString(profile.preferredLanguage)
      },
      message: `Retrieved profile for **${profile.displayName || email || 'authenticated Outlook user'}**.`
    };
  })
  .build();
