import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversionRules = SlateTool.create(spec, {
  name: 'List Conversion Rules',
  key: 'list_conversion_rules',
  description: `List conversion rules configured for a LinkedIn ad account. Conversion rules define how conversions are tracked and attributed.`,
  constraints: ['Requires the rw_conversions scope and Conversions API approval.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Numeric ID of the ad account'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      conversionRules: z.array(
        z.object({
          conversionRuleId: z.number().describe('Numeric ID of the conversion rule'),
          name: z.string().describe('Name of the conversion rule'),
          account: z.string().describe('Account URN'),
          conversionMethod: z.string().describe('Conversion method (e.g., CONVERSIONS_API)'),
          type: z
            .string()
            .describe('Conversion type (e.g., PURCHASE, SIGN_UP, LEAD, ADD_TO_CART)'),
          postClickAttributionWindowSize: z
            .number()
            .optional()
            .describe('Post-click attribution window in days'),
          viewThroughAttributionWindowSize: z
            .number()
            .optional()
            .describe('View-through attribution window in days'),
          attributionType: z.string().optional().describe('Attribution type'),
          enabled: z.boolean().optional().describe('Whether the rule is enabled')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getConversionRules(ctx.input.accountId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let conversionRules = result.elements.map(rule => ({
      conversionRuleId: rule.id,
      name: rule.name,
      account: rule.account,
      conversionMethod: rule.conversionMethod,
      type: rule.type,
      postClickAttributionWindowSize: rule.postClickAttributionWindowSize,
      viewThroughAttributionWindowSize: rule.viewThroughAttributionWindowSize,
      attributionType: rule.attributionType,
      enabled: rule.enabled
    }));

    return {
      output: { conversionRules },
      message: `Found **${conversionRules.length}** conversion rule(s).`
    };
  })
  .build();

export let createConversionRule = SlateTool.create(spec, {
  name: 'Create Conversion Rule',
  key: 'create_conversion_rule',
  description: `Create a new conversion rule for a LinkedIn ad account. Conversion rules define what counts as a conversion and how it is attributed to campaigns.`,
  instructions: [
    'Common conversion types: PURCHASE, SIGN_UP, LEAD, DOWNLOAD, KEY_PAGE_VIEW, ADD_TO_CART, INSTALL, OTHER.',
    'Attribution windows can be 1, 7, 30, or 90 days.'
  ],
  constraints: ['Requires the rw_conversions scope and Conversions API approval.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Numeric ID of the ad account'),
      name: z.string().describe('Name for the conversion rule'),
      type: z
        .string()
        .describe('Conversion type (e.g., PURCHASE, SIGN_UP, LEAD, ADD_TO_CART)'),
      conversionMethod: z
        .string()
        .default('CONVERSIONS_API')
        .describe('Conversion tracking method'),
      postClickAttributionWindowSize: z
        .number()
        .optional()
        .describe('Post-click attribution window in days (1, 7, 30, or 90)'),
      viewThroughAttributionWindowSize: z
        .number()
        .optional()
        .describe('View-through attribution window in days (1, 7, 30, or 90)'),
      attributionType: z
        .string()
        .optional()
        .describe('Attribution type (e.g., LAST_TOUCH_BY_CAMPAIGN, LAST_TOUCH_BY_CONVERSION)')
    })
  )
  .output(
    z.object({
      conversionRuleId: z.string().describe('ID of the created conversion rule')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversionRuleId = await client.createConversionRule({
      name: ctx.input.name,
      account: `urn:li:sponsoredAccount:${ctx.input.accountId}`,
      conversionMethod: ctx.input.conversionMethod,
      type: ctx.input.type,
      postClickAttributionWindowSize: ctx.input.postClickAttributionWindowSize,
      viewThroughAttributionWindowSize: ctx.input.viewThroughAttributionWindowSize,
      attributionType: ctx.input.attributionType
    });

    return {
      output: { conversionRuleId },
      message: `Created conversion rule **${ctx.input.name}** (type: ${ctx.input.type}) with ID **${conversionRuleId}**.`
    };
  })
  .build();

export let sendConversionEvents = SlateTool.create(spec, {
  name: 'Send Conversion Events',
  key: 'send_conversion_events',
  description: `Send conversion events to LinkedIn's Conversions API (CAPI). Connect online and offline conversion data to LinkedIn for campaign attribution. Supports both hashed email and LinkedIn click ID for user matching.`,
  instructions: [
    'User IDs support the following idType values: SHA256_EMAIL (SHA-256 hashed email), LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID (li_fat_id cookie), ACXIOM_ID, ORACLE_MOAT_ID.',
    'conversionHappenedAt should be an epoch timestamp in milliseconds.',
    'The conversion field should reference a conversion rule URN (e.g., "urn:lla:llaPartnerConversion:123456").'
  ],
  constraints: [
    'Requires the rw_conversions scope and Conversions API approval.',
    'Events must reference an existing conversion rule.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      events: z
        .array(
          z.object({
            conversionUrn: z.string().describe('URN of the conversion rule'),
            conversionHappenedAt: z
              .number()
              .describe('Timestamp of conversion in epoch milliseconds'),
            conversionValue: z
              .object({
                currencyCode: z.string().describe('ISO currency code'),
                amount: z.string().describe('Conversion value amount')
              })
              .optional()
              .describe('Monetary value of the conversion'),
            eventId: z.string().optional().describe('Unique event ID for deduplication'),
            userIds: z
              .array(
                z.object({
                  idType: z
                    .string()
                    .describe(
                      'ID type (e.g., SHA256_EMAIL, LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID)'
                    ),
                  idValue: z.string().describe('The ID value')
                })
              )
              .optional()
              .describe('User identifiers for matching'),
            userInfo: z
              .object({
                firstName: z.string().optional(),
                lastName: z.string().optional(),
                companyName: z.string().optional(),
                title: z.string().optional(),
                countryCode: z.string().optional()
              })
              .optional()
              .describe('Additional user information for matching')
          })
        )
        .describe('Array of conversion events to send')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      eventCount: z.number().describe('Number of events sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mappedEvents = ctx.input.events.map(event => ({
      conversion: event.conversionUrn,
      conversionHappenedAt: event.conversionHappenedAt,
      conversionValue: event.conversionValue,
      eventId: event.eventId,
      user:
        event.userIds || event.userInfo
          ? {
              userIds: event.userIds,
              userInfo: event.userInfo
            }
          : undefined
    }));

    await client.sendConversionEvents(mappedEvents);

    return {
      output: { success: true, eventCount: ctx.input.events.length },
      message: `Successfully sent **${ctx.input.events.length}** conversion event(s) to LinkedIn.`
    };
  })
  .build();
