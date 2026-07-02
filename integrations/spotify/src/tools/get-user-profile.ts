import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve a Spotify user profile. Fetch the current authenticated user's full profile (including email, subscription, and country if scoped) or any user's public profile by their user ID.`,
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
      displayName: z.string().nullable(),
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
      market: ctx.config.market
    });

    let user: any;
    if (ctx.input.userId) {
      user = await client.getUserProfile(ctx.input.userId);
    } else {
      user = await client.getCurrentUser();
    }

    let output = {
      userId: user.id,
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
