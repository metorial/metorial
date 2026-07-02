import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let linkOutputSchema = z.object({
  linkId: z.number().describe('Unique link ID'),
  title: z.string().optional().describe('Link title'),
  targetType: z.string().optional().describe('Link type'),
  targetUrl: z.string().optional().describe('Destination URL'),
  shortenedPath: z.string().optional().describe('Short URL path'),
  subdomain: z.string().optional().describe('Subdomain'),
  customDomain: z.string().optional().describe('Custom domain'),
  clickCount: z.number().optional().describe('Total clicks'),
  clickthroughCount: z.number().optional().describe('Total clickthroughs'),
  header: z.string().optional().describe('Landing page header text'),
  callToAction: z.string().optional().describe('Button call-to-action text')
});

export let manageLink = SlateTool.create(spec, {
  name: 'Manage FanLink',
  key: 'manage_link',
  description: `Create, retrieve, update, or delete a smart link (FanLink). FanLinks are customizable landing pages that aggregate links to content across multiple platforms.
Supports music links, podcast episodes, events, tours, big links (multiple URLs), livestreams, fundraisers, and custom redirects.
Links can include tracking pixels, email capture forms, social sharing metadata, and affiliate codes.`,
  instructions: [
    'Use the "expand" action to auto-generate a template link from a URL, UPC, or ISRC code before creating.',
    'Use "validate_path" action to check if a shortened path is available before creating/updating.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'expand', 'validate_path'])
        .describe('Operation to perform'),
      linkId: z.number().optional().describe('Link ID (required for get, update, delete)'),
      title: z.string().optional().describe('Link title'),
      targetType: z
        .enum([
          'music',
          'podcast',
          'livestream',
          'event',
          'tour',
          'biglink',
          'fundraiser',
          'smartlink',
          'custom'
        ])
        .optional()
        .describe('Link type'),
      targetUrl: z.string().optional().describe('Destination URL'),
      customDomain: z.string().optional().describe('Root domain for the link'),
      subdomain: z.string().optional().describe('Subdomain for the link'),
      shortenedPath: z.string().optional().describe('URL path segment'),
      services: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of service links for the landing page'),
      socialSettings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Social profile links'),
      metadataTitle: z.string().optional().describe('Social sharing title'),
      metadataDescription: z.string().optional().describe('Social sharing description'),
      metadataImageUrl: z.string().optional().describe('Social sharing image URL'),
      pixels: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Tracking pixels (Facebook, Google, Twitter, Snapchat, TikTok)'),
      affiliateCodes: z
        .record(z.string(), z.any())
        .optional()
        .describe('iTunes and Amazon affiliate codes'),
      showSocials: z
        .boolean()
        .optional()
        .describe('Show social profile links on landing page'),
      skipLandingPage: z
        .boolean()
        .optional()
        .describe('Redirect directly instead of showing landing page'),
      sortServicesByClickthroughs: z
        .boolean()
        .optional()
        .describe('Auto-sort services by click count'),
      header: z.string().optional().describe('Landing page header text'),
      buttonColor: z.string().optional().describe('Button color hex code'),
      callToAction: z.string().optional().describe('Button call-to-action text'),
      bgColor: z.string().optional().describe('Background color'),
      bgUrl: z.string().optional().describe('Background image URL'),
      imageUrl: z.string().optional().describe('Link image URL'),
      previewUrl: z.string().optional().describe('Preview image URL'),
      url: z
        .string()
        .optional()
        .describe('Source URL for expand action (streaming service link)'),
      upc: z.string().optional().describe('UPC code for expand action'),
      isrc: z.string().optional().describe('ISRC code for expand action'),
      path: z.string().optional().describe('Path to validate for validate_path action')
    })
  )
  .output(
    z.object({
      link: linkOutputSchema.optional().describe('Link details'),
      deleted: z.boolean().optional().describe('Whether the link was deleted'),
      pathValid: z
        .boolean()
        .optional()
        .describe('Whether the path is available (validate_path action)'),
      pathValidReason: z.string().optional().describe('Reason for path validation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let { action, linkId } = ctx.input;

    let mapLink = (l: any) => ({
      linkId: l.id,
      title: l.title,
      targetType: l.target_type,
      targetUrl: l.target_url,
      shortenedPath: l.shortened_path,
      subdomain: l.subdomain,
      customDomain: l.custom_domain,
      clickCount: l.click_count,
      clickthroughCount: l.clickthrough_count,
      header: l.header,
      callToAction: l.call_to_action
    });

    if (action === 'expand') {
      if (!ctx.input.targetType) throw new Error('targetType is required for expand action');
      let link = await client.expandLink({
        targetType: ctx.input.targetType,
        url: ctx.input.url,
        upc: ctx.input.upc,
        isrc: ctx.input.isrc
      });
      return {
        output: { link: mapLink(link) },
        message: `Generated template link for type "${ctx.input.targetType}".`
      };
    }

    if (action === 'validate_path') {
      if (!ctx.input.path) throw new Error('path is required for validate_path action');
      let result = await client.validateLinkPath({
        path: ctx.input.path,
        subdomain: ctx.input.subdomain,
        linkId: ctx.input.linkId
      });
      return {
        output: { pathValid: result.valid, pathValidReason: result.reason },
        message: result.valid
          ? `Path "${ctx.input.path}" is **available**.`
          : `Path "${ctx.input.path}" is **not available**: ${result.reason}.`
      };
    }

    if (action === 'get') {
      if (!linkId) throw new Error('linkId is required for get action');
      let link = await client.getLink(linkId);
      return {
        output: { link: mapLink(link) },
        message: `Retrieved FanLink **"${link.title}"** (ID: ${link.id}).`
      };
    }

    if (action === 'delete') {
      if (!linkId) throw new Error('linkId is required for delete action');
      await client.deleteLink(linkId);
      return {
        output: { deleted: true },
        message: `Deleted FanLink ID **${linkId}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.targetType) data.target_type = ctx.input.targetType;
    if (ctx.input.targetUrl) data.target_url = ctx.input.targetUrl;
    if (ctx.input.customDomain) data.custom_domain = ctx.input.customDomain;
    if (ctx.input.subdomain) data.subdomain = ctx.input.subdomain;
    if (ctx.input.shortenedPath) data.shortened_path = ctx.input.shortenedPath;
    if (ctx.input.services) data.services = ctx.input.services;
    if (ctx.input.socialSettings) data.social_settings = ctx.input.socialSettings;
    if (ctx.input.metadataTitle) data.metadata_title = ctx.input.metadataTitle;
    if (ctx.input.metadataDescription)
      data.metadata_description = ctx.input.metadataDescription;
    if (ctx.input.metadataImageUrl) data.metadata_image_url = ctx.input.metadataImageUrl;
    if (ctx.input.pixels) data.pixels = ctx.input.pixels;
    if (ctx.input.affiliateCodes) data.affiliate_codes = ctx.input.affiliateCodes;
    if (ctx.input.showSocials !== undefined) data.show_socials = ctx.input.showSocials;
    if (ctx.input.skipLandingPage !== undefined)
      data.skip_landing_page = ctx.input.skipLandingPage;
    if (ctx.input.sortServicesByClickthroughs !== undefined)
      data.sort_services_by_clickthroughs = ctx.input.sortServicesByClickthroughs;
    if (ctx.input.header) data.header = ctx.input.header;
    if (ctx.input.buttonColor) data.button_color = ctx.input.buttonColor;
    if (ctx.input.callToAction) data.call_to_action = ctx.input.callToAction;
    if (ctx.input.bgColor) data.bg_color = ctx.input.bgColor;
    if (ctx.input.bgUrl) data.bg_url = ctx.input.bgUrl;
    if (ctx.input.imageUrl) data.image_url = ctx.input.imageUrl;
    if (ctx.input.previewUrl) data.preview_url = ctx.input.previewUrl;

    if (action === 'create') {
      let link = await client.createLink(data);
      return {
        output: { link: mapLink(link) },
        message: `Created FanLink **"${link.title}"** (ID: ${link.id}).`
      };
    }

    // update
    if (!linkId) throw new Error('linkId is required for update action');
    let link = await client.updateLink(linkId, data);
    return {
      output: { link: mapLink(link) },
      message: `Updated FanLink **"${link.title}"** (ID: ${link.id}).`
    };
  })
  .build();
