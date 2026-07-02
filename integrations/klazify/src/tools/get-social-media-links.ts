import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let getSocialMediaLinks = SlateTool.create(spec, {
  name: 'Get Social Media Links',
  key: 'get_social_media_links',
  description: `Retrieves all social media channel links for a domain in real time. Returns URLs for platforms including Facebook, Twitter, Instagram, Medium, YouTube, Pinterest, LinkedIn, and GitHub.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to retrieve social media links for')
    })
  )
  .output(
    z.object({
      facebookUrl: z.string().nullable().optional().describe('Facebook page URL'),
      twitterUrl: z.string().nullable().optional().describe('Twitter/X profile URL'),
      instagramUrl: z.string().nullable().optional().describe('Instagram profile URL'),
      mediumUrl: z.string().nullable().optional().describe('Medium publication URL'),
      youtubeUrl: z.string().nullable().optional().describe('YouTube channel URL'),
      pinterestUrl: z.string().nullable().optional().describe('Pinterest profile URL'),
      linkedinUrl: z.string().nullable().optional().describe('LinkedIn company page URL'),
      githubUrl: z.string().nullable().optional().describe('GitHub organization/profile URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.socialMedia(ctx.input.url);

    let social = result.domain?.social_media ?? {};

    let output = {
      facebookUrl: social.facebook_url ?? null,
      twitterUrl: social.twitter_url ?? null,
      instagramUrl: social.instagram_url ?? null,
      mediumUrl: social.medium_url ?? null,
      youtubeUrl: social.youtube_url ?? null,
      pinterestUrl: social.pinterest_url ?? null,
      linkedinUrl: social.linkedin_url ?? null,
      githubUrl: social.github_url ?? null
    };

    let found = Object.values(output).filter(v => v != null && v !== '').length;
    return {
      output,
      message: `Found **${found}** social media link(s) for **${ctx.input.url}**.`
    };
  })
  .build();
