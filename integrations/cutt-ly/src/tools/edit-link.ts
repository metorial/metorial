import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CuttlyClient } from '../lib/client';
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

    if (input.removePassword && input.password !== undefined) {
      throw createApiServiceError('Provide password or removePassword, not both.');
    }
    if (
      input.uniqueClickMinutes !== undefined &&
      (!Number.isInteger(input.uniqueClickMinutes) ||
        (![0, 1].includes(input.uniqueClickMinutes) &&
          (input.uniqueClickMinutes < 15 || input.uniqueClickMinutes > 1440)))
    ) {
      throw createApiServiceError(
        'uniqueClickMinutes must be 0, 1, or an integer from 15 to 1440.'
      );
    }
    if (input.expireType !== undefined && input.expireCondition === undefined) {
      throw createApiServiceError('Provide expireCondition when setting expireType.');
    }
    if (input.expireCondition !== undefined && input.expireCondition !== '0') {
      if (input.expireType === undefined || !input.expireRedirectUrl) {
        throw createApiServiceError(
          'Provide expireType and expireRedirectUrl when setting expiration.'
        );
      }
      if (input.expireType === 'clicks' && !/^[1-9]\d*$/.test(input.expireCondition)) {
        throw createApiServiceError('Click expiration requires a positive whole click count.');
      }
      if (
        input.expireType === 'date' &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(input.expireCondition) ||
          !Number.isFinite(Date.parse(input.expireCondition)) ||
          new Date(input.expireCondition).toISOString().slice(0, 10) !== input.expireCondition)
      ) {
        throw createApiServiceError(
          'Date expiration requires a valid date in YYYY-MM-DD format.'
        );
      }
    }
    if (
      input.mobileRedirect &&
      input.mobileRedirect.platform !== 'android' &&
      (input.mobileRedirect.androidPackageId !== undefined ||
        input.mobileRedirect.installReferrer !== undefined)
    ) {
      throw createApiServiceError(
        'androidPackageId and installReferrer apply only to Android redirects.'
      );
    }
    if (input.mobileRedirect?.installReferrer && !input.mobileRedirect.androidPackageId) {
      throw createApiServiceError('Provide androidPackageId with installReferrer.');
    }
    if (input.abTest && input.abTest.type !== 'remove') {
      let test = input.abTest;
      if (
        test.bPercentage === undefined ||
        test.bPercentage < 0 ||
        test.bPercentage > 100 ||
        !test.bUrl
      ) {
        throw createApiServiceError(
          'A/B and A/B/C tests require bPercentage from 0 to 100 and bUrl.'
        );
      }
      if (
        test.type === 'abc' &&
        (test.cPercentage === undefined ||
          test.cPercentage < 0 ||
          test.cPercentage > 100 ||
          test.bPercentage + test.cPercentage > 100 ||
          !test.cUrl)
      ) {
        throw createApiServiceError(
          'A/B/C tests require cPercentage from 0 to 100 and cUrl; B and C percentages must total at most 100.'
        );
      }
      if (test.type === 'ab' && (test.cPercentage !== undefined || test.cUrl !== undefined)) {
        throw createApiServiceError('C variation fields require an A/B/C test.');
      }
    }

    if (input.removePassword) {
      await client.removePassword(input.shortLink);
      messages.push('Password removed');
    } else if (input.password !== undefined) {
      await client.setPassword({
        shortLink: input.shortLink,
        password: input.password
      });
      messages.push('Password set');
    }

    let hasGetEdits =
      input.alias !== undefined ||
      input.sourceUrl !== undefined ||
      input.title !== undefined ||
      input.tag !== undefined ||
      input.uniqueClickMinutes !== undefined ||
      input.expireType !== undefined ||
      input.expireCondition !== undefined ||
      input.expireRedirectUrl !== undefined ||
      input.expireUniqueClicks !== undefined ||
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
      if (input.expireCondition === '0') expireValue = 0;
      else if (input.expireType === 'clicks') expireValue = 0;
      else if (input.expireType === 'date') expireValue = 1;

      try {
        await client.editLink({
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
          abtestB: input.abTest?.type === 'remove' ? undefined : input.abTest?.bPercentage,
          abtestBVariation: input.abTest?.type === 'remove' ? undefined : input.abTest?.bUrl,
          abtestC: input.abTest?.type === 'abc' ? input.abTest.cPercentage : undefined,
          abtestCVariation: input.abTest?.type === 'abc' ? input.abTest.cUrl : undefined
        });
      } catch (error) {
        if (messages.length > 0) {
          throw createApiServiceError(
            `${messages.join('. ')}. Remaining link edits failed: ${error instanceof Error ? error.message : 'Cutt.ly API error'}`,
            { parent: error, reason: 'cuttly_partial_update' }
          );
        }
        throw error;
      }

      let editedFields: string[] = [];
      if (input.alias !== undefined) editedFields.push('alias');
      if (input.sourceUrl !== undefined) editedFields.push('source URL');
      if (input.title !== undefined) editedFields.push('title');
      if (input.tag !== undefined) editedFields.push('tag');
      if (input.uniqueClickMinutes !== undefined) editedFields.push('unique click tracking');
      if (
        input.expireType !== undefined ||
        input.expireCondition !== undefined ||
        input.expireRedirectUrl !== undefined ||
        input.expireUniqueClicks !== undefined
      )
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
