import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve a Spotify user profile. Fetch the current authenticated user's full profile (including email, subscription, and country if scoped) or a user's public profile with confirmed legacy endpoint access. Optional private fields may be omitted by Spotify.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          "Spotify user ID to look up. Omit to get the current authenticated user's profile."
        )
    })
  )
  .output(
    z.object({
      userId: z.string(),
      accountId: z.string().optional().describe('Immutable current-account identifier'),
      displayName: z.string().nullable().optional(),
      email: z.string().optional(),
      country: z.string().optional(),
      product: z.string().optional(),
      followers: z.number().optional(),
      imageUrl: z.string().nullable(),
      spotifyUrl: z.string(),
      uri: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      refreshToken: ctx.auth.refreshToken,
      input: ctx.input,
      market: ctx.config.market,
      endpointCompatibility: ctx.config.endpointCompatibility
    });

    let user: Awaited<ReturnType<SpotifyClient['getCurrentUser']>>;
    if (ctx.input.userId) {
      user = await client.getUserProfile(ctx.input.userId);
    } else {
      user = await client.getCurrentUser();
    }

    let output = {
      userId: user.id,
      accountId: user.account_id,
      displayName: user.display_name,
      email: user.email,
      country: user.country,
      product: user.product,
      followers: user.followers?.total,
      imageUrl: user.images?.[0]?.url ?? null,
      spotifyUrl: user.external_urls.spotify,
      uri: user.uri
    };

    return {
      output,
      message: `Retrieved profile for **${user.display_name ?? user.id}**${user.product ? ` (${user.product})` : ''}.`
    };
  });
