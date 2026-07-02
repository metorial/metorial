import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

export let getDomainTracking = SlateTool.create(spec, {
  name: 'Get Domain Tracking',
  key: 'get_domain_tracking',
  description: `Get the current tracking settings for a domain. Shows whether open tracking, click tracking, and unsubscribe tracking are enabled.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainName: z.string().describe('Domain name to get tracking settings for')
    })
  )
  .output(
    z.object({
      openTracking: z.boolean().describe('Whether open tracking is enabled'),
      clickTracking: z.boolean().describe('Whether click tracking is enabled'),
      unsubscribeTracking: z.boolean().describe('Whether unsubscribe tracking is enabled'),
      unsubscribeHtmlFooter: z
        .string()
        .optional()
        .describe('HTML footer for unsubscribe links'),
      unsubscribeTextFooter: z
        .string()
        .optional()
        .describe('Text footer for unsubscribe links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getDomainTracking(ctx.input.domainName);

    let t = result.tracking;
    return {
      output: {
        openTracking: t.open.active,
        clickTracking: t.click.active,
        unsubscribeTracking: t.unsubscribe.active,
        unsubscribeHtmlFooter: t.unsubscribe.html_footer,
        unsubscribeTextFooter: t.unsubscribe.text_footer
      },
      message: `Tracking for **${ctx.input.domainName}**: opens=${t.open.active}, clicks=${t.click.active}, unsubscribes=${t.unsubscribe.active}`
    };
  })
  .build();

export let updateDomainTracking = SlateTool.create(spec, {
  name: 'Update Domain Tracking',
  key: 'update_domain_tracking',
  description: `Update tracking settings for a domain. Configure open tracking, click tracking, or unsubscribe tracking individually.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domainName: z.string().describe('Domain name to update tracking for'),
      trackingType: z
        .enum(['open', 'click', 'unsubscribe'])
        .describe('Type of tracking to update'),
      active: z.boolean().describe('Whether to enable or disable this tracking type'),
      htmlFooter: z
        .string()
        .optional()
        .describe('HTML footer for unsubscribe (only for unsubscribe tracking)'),
      textFooter: z
        .string()
        .optional()
        .describe('Text footer for unsubscribe (only for unsubscribe tracking)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.updateDomainTracking(ctx.input.domainName, ctx.input.trackingType, {
      active: ctx.input.active,
      htmlFooter: ctx.input.htmlFooter,
      textFooter: ctx.input.textFooter
    });

    return {
      output: { success: true },
      message: `${ctx.input.trackingType} tracking **${ctx.input.active ? 'enabled' : 'disabled'}** for **${ctx.input.domainName}**.`
    };
  })
  .build();
