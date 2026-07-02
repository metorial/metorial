import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let getMemberAccessUrls = SlateTool.create(spec, {
  name: 'Get Member Access URLs',
  key: 'get_member_access_urls',
  description: `Generate pre-authenticated share links, portal access URLs, and social sharing URLs for a member. Use to embed sharing experiences or securely provide member access to the portal or share widget in your application.`,
  instructions: [
    'Provide exactly one of memberId, referralCode, emailAddress, or externalId to identify the member.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      memberId: z.string().optional().describe('Member ID'),
      referralCode: z.string().optional().describe('Referral code'),
      emailAddress: z.string().optional().describe('Email address'),
      externalId: z.string().optional().describe('External system ID'),
      expireInMinutes: z
        .number()
        .optional()
        .describe('URL expiration time in minutes (5-43200, default 20)')
    })
  )
  .output(
    z.object({
      shareEmbedUrl: z.string().optional().describe('Share widget embed URL'),
      fullEmbedUrl: z.string().optional().describe('Full portal embed URL'),
      referralCode: z.string().optional().describe('Member referral code'),
      shareUrl: z.string().optional().describe('Generic share URL'),
      portalUrl: z.string().optional().describe('Member portal URL'),
      facebookShareUrl: z.string().optional().describe('Facebook share URL'),
      twitterShareUrl: z.string().optional().describe('Twitter share URL'),
      linkedInShareUrl: z.string().optional().describe('LinkedIn share URL'),
      emailShareUrl: z.string().optional().describe('Email share URL'),
      smsShareUrl: z.string().optional().describe('SMS share URL'),
      whatsAppShareUrl: z.string().optional().describe('WhatsApp share URL'),
      telegramShareUrl: z.string().optional().describe('Telegram share URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.getMemberAccessUrls({
      memberId: ctx.input.memberId,
      referralCode: ctx.input.referralCode,
      emailAddress: ctx.input.emailAddress,
      externalId: ctx.input.externalId,
      expireInMinutes: ctx.input.expireInMinutes
    });

    let r = result as Record<string, string>;

    return {
      output: {
        shareEmbedUrl: r.shareEmbedUrl,
        fullEmbedUrl: r.fullEmbedUrl,
        referralCode: r.referralCode,
        shareUrl: r.shareUrl,
        portalUrl: r.portalUrl,
        facebookShareUrl: r.facebookShareUrl,
        twitterShareUrl: r.twitterShareUrl,
        linkedInShareUrl: r.linkedInShareUrl,
        emailShareUrl: r.emailShareUrl,
        smsShareUrl: r.smsShareUrl,
        whatsAppShareUrl: r.whatsAppShareUrl,
        telegramShareUrl: r.telegramShareUrl
      },
      message: `Generated access URLs for member **${ctx.input.memberId || ctx.input.referralCode || ctx.input.emailAddress || ctx.input.externalId}**.`
    };
  })
  .build();
