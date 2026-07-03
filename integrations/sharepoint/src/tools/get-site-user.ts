import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  getSharePointHostnameFromWebUrl,
  normalizeSharePointSiteUserEmail,
  SharePointClient
} from '../lib/client';
import { spec } from '../spec';

let siteUserOutputSchema = z.object({
  id: z
    .number()
    .int()
    .describe('Numeric SharePoint site-scoped user ID used for Person/Group LookupId fields'),
  loginName: z.string().describe('SharePoint login name for the site user'),
  email: z.string().describe('Email address stored on the SharePoint site user record'),
  displayName: z.string().describe('Display name stored on the SharePoint site user record')
});

let serviceError = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isNotFoundError = (error: unknown) => {
  let status = (error as { data?: { upstreamStatus?: unknown } })?.data?.upstreamStatus;
  return status === 404 || status === '404';
};

export let getSiteUser = SlateTool.create(spec, {
  name: 'Get Site User',
  key: 'get_site_user',
  description:
    'Resolve a user email or UPN to the numeric SharePoint site-scoped user ID required for Person/Group list column LookupId fields.',
  instructions: [
    'Use this before updating a SharePoint Person/Group field when you only have an email address or UPN.',
    'Pass the SharePoint **siteId** and the user **email**. The returned **id** is the numeric value to write to a list item field named like `{fieldName}LookupId`.',
    'This tool reads an existing site user record only; it does not create or ensure a user on the site.'
  ],
  constraints: [
    'The user must already have a SharePoint site-scoped user record.',
    'The SharePoint connection must include a SharePoint REST token for the requested site hostname.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('SharePoint site ID'),
      email: z.string().describe("User's email address or user principal name")
    })
  )
  .output(siteUserOutputSchema)
  .handleInvocation(async ctx => {
    let email = normalizeSharePointSiteUserEmail(ctx.input.email);
    let sharepointToken =
      typeof ctx.auth.sharepointToken === 'string' ? ctx.auth.sharepointToken : undefined;
    let sharepointHostname =
      typeof ctx.auth.sharepointHostname === 'string'
        ? ctx.auth.sharepointHostname
        : undefined;

    if (!sharepointToken) {
      throw serviceError(
        'SharePoint REST access token is missing. Reconnect SharePoint auth so site user lookups can resolve numeric site user IDs.',
        'sharepoint_rest_token_missing'
      );
    }

    let client = new SharePointClient({
      graphToken: ctx.auth.token,
      sharepointToken
    });
    let site = await client.getSite(ctx.input.siteId);
    let webUrl = typeof site.webUrl === 'string' ? site.webUrl : undefined;
    if (!webUrl) {
      throw serviceError(
        'Microsoft Graph did not return a webUrl for the requested SharePoint site.',
        'sharepoint_site_web_url_missing'
      );
    }

    let siteHostname = getSharePointHostnameFromWebUrl(webUrl);
    if (
      sharepointHostname &&
      siteHostname.toLowerCase() !== sharepointHostname.toLowerCase()
    ) {
      throw serviceError(
        `The SharePoint REST token is scoped to ${sharepointHostname}, but the requested site is on ${siteHostname}. Reconnect using an account/tenant configuration for the requested SharePoint host.`,
        'sharepoint_rest_hostname_mismatch'
      );
    }

    let user = await client.getSiteUserByEmail(webUrl, email).catch(error => {
      if (isNotFoundError(error)) {
        throw serviceError(
          `No SharePoint site user record was found for ${email} on ${siteHostname}. The user may need to access the site before a numeric site user ID exists.`,
          'sharepoint_site_user_not_found'
        );
      }

      throw error;
    });

    return {
      output: user,
      message: `Resolved ${user.email || email} to SharePoint site user ID ${user.id}.`
    };
  })
  .build();
