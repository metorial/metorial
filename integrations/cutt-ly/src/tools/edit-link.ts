import { SlateTool } from 'slates';
import { z } from 'zod';
import { CuttlyClient, getEditStatusMessage } from '../lib/client';
import { spec } from '../spec';

export let editLink = SlateTool.create(spec, {
  name: 'Edit Link',
  key: 'edit_link',
  description: `Edit properties of an existing Cutt.ly shortened link. Supports changing the alias, destination URL, title, tag, unique click tracking, password protection, expiration settings, mobile redirects/deep links, and A/B/C testing configuration. All edit fields are optional — only the ones provided will be updated.`,
  instructions: [
    'Provide the shortened link URL to identify which link to edit.',
    'Only include the fields you want to change — omitted fields will not be modified.',
    'For password protection: set password to a string to protect, or set removePassword to true to remove it.',
    'For expiration by clicks: set expireType to "clicks" and expireCondition to the click count.',
    'For expiration by date: set expireType to "date" and expireCondition to a date string (YYYY-MM-DD).',
    'To remove expiration: set expireCondition to "0".'
  ],
  constraints: [
    'Requires a Single plan or higher.',
    'Unique click tracking with custom time windows (15–1440 min) requires a Team plan.',
    'You can only edit links that you own.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      shortLink: z.string().describe('The shortened URL to edit'),
      alias: z.string().optional().describe('New alias/back-half for the short link'),
      sourceUrl: z
        .string()
        .optional()
        .describe('New destination URL the short link redirects to'),
      title: z.string().optional().describe('New display title for the link'),
      tag: z.string().optional().describe('Tag to associate with the link'),
      uniqueClickMinutes: z
        .number()
        .optional()
        .describe(
          'Unique click tracking window in minutes. Use 0 to disable, 1 for Single plan (15-min window), or 15–1440 for Team plans.'
        ),
      password: z
        .string()
        .optional()
        .describe('Set a password to protect the link. Provide the password string.'),
      removePassword: z
        .boolean()
        .optional()
        .describe('Set to true to remove password protection from the link.'),
      expireType: z
        .enum(['clicks', 'date'])
        .optional()
        .describe(
          'Expiration type: "clicks" for click-based or "date" for date-based expiration.'
        ),
      expireCondition: z
        .string()
        .optional()
        .describe(
          'Expiration condition: number of clicks (as string) or date in YYYY-MM-DD format. Use "0" to remove expiration.'
        ),
      expireRedirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect to after the link expires.'),
      expireUniqueClicks: z
        .boolean()
        .optional()
        .describe('If true, count only unique clicks toward expiration.'),
      mobileRedirect: z
        .object({
          platform: z
            .enum(['android', 'ios', 'windowsMobile', 'redirect'])
            .describe('Mobile platform to redirect'),
          destinationUrl: z.string().describe('URL to redirect mobile users to'),
          androidPackageId: z
            .string()
            .optional()
            .describe('Android package name for deferred deep linking'),
          installReferrer: z
            .string()
            .optional()
            .describe('Deferred deep link payload passed to the app after install')
        })
        .optional()
        .describe('Mobile redirect / deep link configuration'),
      abTest: z
        .object({
          type: z
            .enum(['ab', 'abc', 'remove'])
            .describe('"ab" for A/B test, "abc" for A/B/C test, "remove" to remove testing'),
          bPercentage: z
            .number()
            .optional()
            .describe('Percentage (0–100) of traffic for the B variation'),
          bUrl: z.string().optional().describe('URL for the B variation'),
          cPercentage: z
            .number()
            .optional()
            .describe('Percentage (0–100) of traffic for the C variation (ABC test only)'),
          cUrl: z.string().optional().describe('URL for the C variation (ABC test only)')
        })
        .optional()
        .describe('A/B or A/B/C split test configuration')
    })
  )
  .output(
    z.object({
      shortLink: z.string().describe('The shortened URL that was edited'),
      statusMessage: z.string().describe('Human-readable status message describing the result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CuttlyClient({
      apiKey: ctx.auth.token,
      apiType: ctx.config.apiType
    });

    let input = ctx.input;
    let messages: string[] = [];

    // Handle password separately (requires POST)
    if (input.removePassword) {
      let pwResult = await client.removePassword(input.shortLink);
      if (pwResult.status !== 1) {
        throw new Error(`Failed to remove password: ${getEditStatusMessage(pwResult.status)}`);
      }
      messages.push('Password removed');
    } else if (input.password !== undefined) {
      let pwResult = await client.setPassword({
        shortLink: input.shortLink,
        password: input.password
      });
      if (pwResult.status !== 1) {
        throw new Error(`Failed to set password: ${getEditStatusMessage(pwResult.status)}`);
      }
      messages.push('Password set');
    }

    // Build edit params for all GET-based edits
    let hasGetEdits =
      input.alias !== undefined ||
      input.sourceUrl !== undefined ||
      input.title !== undefined ||
      input.tag !== undefined ||
      input.uniqueClickMinutes !== undefined ||
      input.expireType !== undefined ||
      input.expireCondition !== undefined ||
      input.mobileRedirect !== undefined ||
      input.abTest !== undefined;

    if (hasGetEdits) {
      let abTestValue: number | undefined;
      if (input.abTest) {
        if (input.abTest.type === 'remove') abTestValue = 0;
        else if (input.abTest.type === 'ab') abTestValue = 1;
        else if (input.abTest.type === 'abc') abTestValue = 2;
      }

      let expireValue: number | undefined;
      if (input.expireType === 'clicks') expireValue = 0;
      else if (input.expireType === 'date') expireValue = 1;

      let result = await client.editLink({
        shortLink: input.shortLink,
        name: input.alias,
        source: input.sourceUrl,
        title: input.title,
        tag: input.tag,
        unique: input.uniqueClickMinutes,
        mobile: input.mobileRedirect?.platform,
        destination: input.mobileRedirect?.destinationUrl,
        packageId: input.mobileRedirect?.androidPackageId,
        referrer: input.mobileRedirect?.installReferrer,
        expire: expireValue,
        expireCond: input.expireCondition,
        expireRedirect: input.expireRedirectUrl,
        expireUnique: input.expireUniqueClicks
          ? 1
          : input.expireUniqueClicks === false
            ? 0
            : undefined,
        abtest: abTestValue,
        abtestB: input.abTest?.bPercentage,
        abtestBVariation: input.abTest?.bUrl,
        abtestC: input.abTest?.cPercentage,
        abtestCVariation: input.abTest?.cUrl
      });

      if (result.status !== 1) {
        throw new Error(`Failed to edit link: ${getEditStatusMessage(result.status)}`);
      }

      let editedFields: string[] = [];
      if (input.alias !== undefined) editedFields.push('alias');
      if (input.sourceUrl !== undefined) editedFields.push('source URL');
      if (input.title !== undefined) editedFields.push('title');
      if (input.tag !== undefined) editedFields.push('tag');
      if (input.uniqueClickMinutes !== undefined) editedFields.push('unique click tracking');
      if (input.expireType !== undefined || input.expireCondition !== undefined)
        editedFields.push('expiration');
      if (input.mobileRedirect !== undefined) editedFields.push('mobile redirect');
      if (input.abTest !== undefined) editedFields.push('A/B test');

      messages.push(`Updated: ${editedFields.join(', ')}`);
    }

    let statusMessage = messages.length > 0 ? messages.join('. ') : 'No changes applied';

    return {
      output: {
        shortLink: input.shortLink,
        statusMessage
      },
      message: `Edited **${input.shortLink}**: ${statusMessage}`
    };
  })
  .build();
