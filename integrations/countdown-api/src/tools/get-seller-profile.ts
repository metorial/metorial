import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let getSellerProfile = SlateTool.create(spec, {
  name: 'Get Seller Profile',
  key: 'get_seller_profile',
  description: `Retrieve an eBay seller's profile information. Look up by seller name or a direct seller profile URL. Returns seller name, positive rating percentage, follower count, location, description, profile image, and top-rated seller status.`,
  instructions: [
    'Provide either `sellerName` with `ebayDomain`, or a `url` to the seller profile page.',
    'Set `isStore` to true if the seller uses eBay storefronts (/str/ URL format).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ebayDomain: z
        .enum([
          'ebay.com',
          'ebay.co.uk',
          'ebay.com.au',
          'ebay.at',
          'ebay.be',
          'befr.ebay.be',
          'benl.ebay.be',
          'ebay.ca',
          'ebay.fr',
          'ebay.de',
          'ebay.com.hk',
          'ebay.ie',
          'ebay.it',
          'ebay.com.my',
          'ebay.nl',
          'ebay.ph',
          'ebay.pl',
          'ebay.com.sg',
          'ebay.es',
          'ebay.ch'
        ])
        .optional()
        .describe('eBay domain. Defaults to configured domain.'),
      sellerName: z.string().optional().describe('The seller name to look up.'),
      url: z.string().optional().describe('Direct URL to the seller profile page.'),
      isStore: z
        .boolean()
        .optional()
        .describe(
          'Set to true for eBay storefront sellers (uses /str/ URL format instead of /usr/).'
        )
    })
  )
  .output(
    z.object({
      sellerProfile: z
        .any()
        .describe(
          'Seller profile data including name, positive rating, followers, location, description, and top-rated status.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });
    let ebayDomain = ctx.input.ebayDomain || ctx.config.ebayDomain;

    let result = await client.getSellerProfile({
      ebayDomain,
      sellerName: ctx.input.sellerName,
      url: ctx.input.url,
      isStore: ctx.input.isStore
    });

    let profile = result.seller_profile || {};

    return {
      output: {
        sellerProfile: profile
      },
      message: `Retrieved seller profile for **${profile.name || ctx.input.sellerName || 'unknown'}**.${profile.positive_feedback_percentage ? ` Positive feedback: **${profile.positive_feedback_percentage}%**` : ''}${profile.top_rated ? ' (Top Rated Seller)' : ''}.`
    };
  })
  .build();
