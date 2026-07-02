import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichTwitter = SlateTool.create(spec, {
  name: 'Enrich Twitter Profile',
  key: 'enrich_twitter',
  description: `Enrich a Twitter/X profile with email, social URLs, skills, interests, and more. Look up a profile by **Twitter username**, **LinkedIn URL**, or **email address**.
Returns the Twitter profile data along with linked social profiles (LinkedIn, Facebook, GitHub), industry, skills, and interests.`,
  instructions: [
    'Provide a Twitter username, a LinkedIn URL, or an email address to look up the profile.',
    'Twitter usernames are case-sensitive.',
    'For LinkedIn URL, omit the https:// prefix (e.g. "linkedin.com/in/raphaelazot").'
  ],
  constraints: ['Rate limited to 10 requests per second.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      twitterUsername: z.string().optional().describe('Twitter/X username (case-sensitive)'),
      linkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn URL without https:// (e.g. "linkedin.com/in/johndoe")'),
      email: z.string().optional().describe('Email address to look up the Twitter/X profile')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Lookup status'),
      twitterEmail: z
        .string()
        .optional()
        .describe('Email associated with the Twitter account'),
      twitterUsername: z.string().optional().describe('Twitter username'),
      twitterUser: z.any().optional().describe('Twitter user profile data'),
      fullName: z.string().optional().describe('Full name of the person'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      linkedinId: z.string().optional().describe('LinkedIn ID'),
      facebookUrl: z.string().optional().describe('Facebook profile URL'),
      githubUrl: z.string().optional().describe('GitHub profile URL'),
      industry: z.string().optional().describe('Industry of the person'),
      skills: z.array(z.string()).optional().describe('Skills of the person'),
      interests: z.array(z.string()).optional().describe('Interests of the person'),
      locationName: z.string().optional().describe('Location name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result: any;

    if (ctx.input.email) {
      result = await client.getTwitterByEmail({ email: ctx.input.email });
    } else {
      result = await client.getTwitterByUsername({
        username: ctx.input.twitterUsername,
        linkedin: ctx.input.linkedinUrl
      });
    }

    let twitter = result?.twitter || {};
    let other = result?.other || {};

    return {
      output: {
        status: result?.status,
        twitterEmail: twitter?.email,
        twitterUsername: twitter?.username,
        twitterUser: twitter?.user,
        fullName: other?.fullName,
        linkedinUrl: other?.linkedinUrl,
        linkedinId: other?.linkedinId,
        facebookUrl: other?.facebookUrl,
        githubUrl: other?.githubUrl,
        industry: other?.industry,
        skills: other?.skills,
        interests: other?.interests,
        locationName: other?.locationName
      },
      message: `Twitter enrichment for **${twitter?.username || ctx.input.twitterUsername || ctx.input.email || 'the profile'}**: ${result?.status === 'ok' || result?.twitter ? 'profile found' : 'no match found'}.`
    };
  })
  .build();
