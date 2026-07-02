import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createShortLink = SlateTool.create(spec, {
  name: 'Create Personalised Short Link',
  key: 'create_short_link',
  description: `Create a personalized short URL that embeds a dynamic image preview. When the link is shared on platforms like LinkedIn, Slack, or email clients, recipients see a personalized image thumbnail with their name, company, or other details. The link redirects to the destination URL while passing personalization through.`,
  instructions: [
    'The imageTemplateHash can be obtained from the List Image Templates tool.',
    'All personalization fields are optional — only provide the ones relevant to your use case.'
  ]
})
  .input(
    z.object({
      imageTemplateHash: z
        .string()
        .describe('Hash identifier of the image template to personalize'),
      destinationUrl: z.string().describe('The URL the short link redirects to'),
      pageTitle: z
        .string()
        .describe('Title shown in Open Graph previews when the link is shared'),
      pageDescription: z
        .string()
        .describe('Description shown in Open Graph previews when the link is shared'),
      firstName: z.string().optional().describe('Recipient first name for personalization'),
      lastName: z.string().optional().describe('Recipient last name for personalization'),
      email: z.string().optional().describe('Recipient email for personalization'),
      phone: z.string().optional().describe('Recipient phone number for personalization'),
      jobTitle: z.string().optional().describe('Recipient job title for personalization'),
      profileUrl: z
        .string()
        .optional()
        .describe('URL of the recipient profile image for personalization'),
      businessName: z.string().optional().describe('Company name for personalization'),
      website: z.string().optional().describe('Company website for logo resolution'),
      logo: z.string().optional().describe('Company logo image URL for personalization')
    })
  )
  .output(
    z
      .object({
        shortLink: z.string().describe('The generated personalized short URL')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let queryParams: Record<string, string> = {};
    if (ctx.input.firstName) queryParams.first_name = ctx.input.firstName;
    if (ctx.input.lastName) queryParams.last_name = ctx.input.lastName;
    if (ctx.input.email) queryParams.email = ctx.input.email;
    if (ctx.input.phone) queryParams.phone = ctx.input.phone;
    if (ctx.input.jobTitle) queryParams.job_title = ctx.input.jobTitle;
    if (ctx.input.profileUrl) queryParams.profile_url = ctx.input.profileUrl;
    if (ctx.input.businessName) queryParams.business_name = ctx.input.businessName;
    if (ctx.input.website) queryParams.website = ctx.input.website;
    if (ctx.input.logo) queryParams.logo = ctx.input.logo;

    let result = await client.createShortLink({
      image_hash: ctx.input.imageTemplateHash,
      url: ctx.input.destinationUrl,
      title: ctx.input.pageTitle,
      desc: ctx.input.pageDescription,
      query_params: Object.keys(queryParams).length > 0 ? queryParams : undefined
    });

    let link =
      result?.link ||
      result?.short_link ||
      result?.url ||
      result?.data?.link ||
      result?.data?.short_link;

    return {
      output: {
        shortLink: link,
        ...result
      },
      message: `Created personalised short link: **${link}**`
    };
  })
  .build();
