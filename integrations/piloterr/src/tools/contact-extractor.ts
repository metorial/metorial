import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let extractContactsOutputSchema = z.object({
  emails: z.array(z.string()).optional().describe('Extracted email addresses'),
  phoneNumbers: z
    .array(
      z.object({
        e164: z.string().optional(),
        local: z.string().optional(),
        valid: z.boolean().optional(),
        country: z.string().optional(),
        countryCode: z.string().optional(),
        international: z.string().optional()
      })
    )
    .optional()
    .describe('Extracted phone numbers with formatting'),
  contactPages: z.array(z.string()).optional().describe('Discovered contact pages'),
  linkedinProfiles: z.array(z.string()).optional(),
  twitterProfiles: z.array(z.string()).optional(),
  instagramProfiles: z.array(z.string()).optional(),
  facebookProfiles: z.array(z.string()).optional(),
  tiktokProfiles: z.array(z.string()).optional(),
  youtubeChannels: z.array(z.string()).optional(),
  raw: z.any().describe('Full raw response')
});

export let extractContacts = SlateTool.create(spec, {
  name: 'Extract Website Contacts',
  key: 'extract_contacts',
  description: `Extract email addresses, phone numbers, and social media profiles from any webpage. Scans the page and its contact pages for emails, phone numbers (with international formatting), LinkedIn, Twitter, Instagram, Facebook, TikTok, YouTube, Reddit, Telegram, and other social profiles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the webpage to extract contacts from'),
      countryCode: z
        .string()
        .optional()
        .describe('Country code for phone number formatting (e.g., "FR", "US")')
    })
  )
  .output(extractContactsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.extractContactInfo({
      url: ctx.input.url,
      countryCode: ctx.input.countryCode
    });

    return {
      output: normalizeOutput(extractContactsOutputSchema, {
        emails: result.emails,
        phoneNumbers: result.phone_numbers,
        contactPages: result.contact_pages,
        linkedinProfiles: result.linkedin_profiles,
        twitterProfiles: result.twitter_profiles,
        instagramProfiles: result.instagram_profiles,
        facebookProfiles: result.facebook_profiles,
        tiktokProfiles: result.tiktok_profiles,
        youtubeChannels: result.youtube_channels,
        raw: result
      }),
      message: 'Retrieved website contact information.'
    };
  })
  .build();
