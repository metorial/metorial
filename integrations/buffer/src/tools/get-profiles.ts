import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/errors';
import { spec } from '../spec';

let profileSchema = z.object({
  profileId: z.string().describe('Unique identifier for the profile'),
  service: z
    .string()
    .describe('Social network service name (e.g. twitter, facebook, linkedin)'),
  serviceUsername: z.string().optional().describe('Provider channel name or legacy username'),
  formattedService: z
    .string()
    .optional()
    .describe('Human-readable service name when supplied'),
  formattedUsername: z.string().optional().describe('Provider display name when supplied'),
  avatar: z.string().optional().describe('URL of the profile avatar'),
  isDefault: z.boolean().optional().describe('Legacy default flag when supplied'),
  sentCount: z.number().optional().describe('Provider-supplied sent count'),
  pendingCount: z.number().optional().describe('Provider-supplied pending count'),
  draftsCount: z.number().optional().describe('Provider-supplied draft count'),
  organizationId: z
    .string()
    .optional()
    .describe('Current API organization owning this channel'),
  serviceId: z
    .string()
    .optional()
    .describe('Connected social-account identifier supplied by the current API'),
  timezone: z.string().optional().describe('Channel timezone supplied by the current API'),
  isQueuePaused: z
    .boolean()
    .optional()
    .describe('Whether automatic publication from this channel queue is paused')
});

export let getProfilesTool = SlateTool.create(spec, {
  name: 'Get Profiles',
  key: 'get_profiles',
  description: `Retrieve connected social media profiles (channels). Read one profile by ID, profiles in a current API organization, or profiles across accessible organizations. Counts are returned only when supplied by the provider.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'Current API organization ID from Get Organizations; omit to discover across accessible organizations.'
        ),
      profileId: z
        .string()
        .optional()
        .describe(
          'Optional profile ID to retrieve a specific profile. If omitted, returns all profiles.'
        )
    })
  )
  .output(
    z.object({
      profiles: z.array(profileSchema).describe('List of social media profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    const profiles =
      ctx.input.profileId !== undefined
        ? [await client.getProfile(ctx.input.profileId)]
        : await client.getProfiles(ctx.input.organizationId);
    if (
      ctx.input.profileId !== undefined &&
      ctx.input.organizationId !== undefined &&
      profiles[0]?.organizationId !== ctx.input.organizationId
    )
      throw invalid(
        'The requested profile does not belong to organizationId, or the legacy connection does not expose organizations.'
      );

    let mapped = profiles.map(p => ({
      profileId: p.id,
      service: p.service,
      serviceUsername: p.serviceUsername,
      formattedService: p.formattedService,
      formattedUsername: p.formattedUsername,
      avatar: p.avatar,
      isDefault: p.default,
      sentCount: p.counts?.sent,
      pendingCount: p.counts?.pending,
      draftsCount: p.counts?.drafts,
      organizationId: p.organizationId,
      serviceId: p.serviceId,
      timezone: p.timezone,
      isQueuePaused: p.isQueuePaused
    }));

    return {
      output: { profiles: mapped },
      message: `Retrieved **${mapped.length}** Buffer profile(s).`
    };
  })
  .build();
