import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { messengerServiceError } from '../lib/errors';
import { spec } from '../spec';

let isHttpsUrl = (value: string) => /^https:\/\//i.test(value);

let menuActionSchema: z.ZodType<any> = z.object({
  type: z.enum(['postback', 'web_url', 'nested']).describe('Action type'),
  title: z.string().max(30).describe('Menu item label'),
  payload: z
    .string()
    .max(1000)
    .optional()
    .describe('Postback payload (required for postback type)'),
  url: z
    .string()
    .refine(isHttpsUrl, 'url must be an HTTPS URL')
    .optional()
    .describe('URL to open (required for web_url type)'),
  callToActions: z
    .array(
      z.object({
        type: z.enum(['postback', 'web_url']).describe('Sub-action type'),
        title: z.string().max(30).describe('Sub-menu item label'),
        payload: z.string().max(1000).optional().describe('Postback payload'),
        url: z
          .string()
          .refine(isHttpsUrl, 'url must be an HTTPS URL')
          .optional()
          .describe('URL to open')
      })
    )
    .max(5)
    .optional()
    .describe('Sub-menu items (only for nested type, max 5)')
});

export let manageProfile = SlateTool.create(spec, {
  name: 'Manage Messenger Profile',
  key: 'manage_messenger_profile',
  description: `Configure the Messenger experience for your Page. Set or update the **Get Started** button, **greeting text**, **persistent menu**, **ice breakers**, and **whitelisted domains**.
Provide only the fields you want to update — unspecified fields remain unchanged. Use the **delete** action to remove specific profile settings.`,
  instructions: [
    'Use action "set" to create or update profile settings. Only provide the fields you want to change.',
    'Use action "get" to retrieve current profile settings.',
    'Use action "delete" to remove specific profile fields.',
    'Greeting text supports {{user_first_name}}, {{user_last_name}}, and {{user_full_name}} personalization tokens.',
    'The persistent menu supports up to 20 call-to-action items per locale.'
  ],
  constraints: [
    'Persistent menu is limited to 20 call-to-action items per locale.',
    'Ice breakers are limited to a small number of questions.',
    'Some features may be unavailable for EEA users.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'set', 'delete'])
        .describe('Action to perform on the Messenger profile'),

      // Fields for "get" and "delete" actions
      fields: z
        .array(
          z.enum([
            'get_started',
            'account_linking_url',
            'greeting',
            'persistent_menu',
            'ice_breakers',
            'whitelisted_domains'
          ])
        )
        .optional()
        .describe(
          'Profile fields to retrieve or delete. Required for "get" and "delete" actions.'
        ),

      // Fields for "set" action
      getStartedPayload: z
        .string()
        .optional()
        .describe('Postback payload triggered when the Get Started button is tapped'),
      accountLinkingUrl: z
        .string()
        .refine(isHttpsUrl, 'accountLinkingUrl must be an HTTPS URL')
        .optional()
        .describe('HTTPS URL for linking a Messenger user to an external account'),
      greetingTexts: z
        .array(
          z.object({
            locale: z.string().describe('Locale code (e.g. "default", "en_US", "fr_FR")'),
            text: z
              .string()
              .max(160)
              .describe(
                'Greeting message text. Supports {{user_first_name}}, {{user_last_name}}, {{user_full_name}}.'
              )
          })
        )
        .optional()
        .describe('Greeting texts shown on the welcome screen, by locale'),
      persistentMenu: z
        .array(
          z.object({
            locale: z.string().describe('Locale code (e.g. "default")'),
            composerInputDisabled: z
              .boolean()
              .optional()
              .describe('Whether to disable the text composer when the menu is active'),
            callToActions: z
              .array(menuActionSchema)
              .max(20)
              .optional()
              .describe('Top-level menu items (max 20)')
          })
        )
        .optional()
        .describe('Persistent menu configuration by locale'),
      iceBreakers: z
        .array(
          z.object({
            question: z.string().max(80).describe('Question text shown to the user'),
            payload: z
              .string()
              .max(1000)
              .describe('Postback payload sent when the question is tapped')
          })
        )
        .max(4)
        .optional()
        .describe('Ice breaker questions shown to first-time users'),
      whitelistedDomains: z
        .array(z.string().refine(isHttpsUrl, 'Whitelisted domains must be HTTPS URLs'))
        .max(10)
        .optional()
        .describe('List of domains whitelisted for Messenger Extensions and webviews')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      profileSettings: z
        .any()
        .optional()
        .describe('Current profile settings (only for "get" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.config.pageId,
      apiVersion: ctx.config.apiVersion
    });

    let { input } = ctx;

    switch (input.action) {
      case 'get': {
        let fields = input.fields || [
          'get_started',
          'account_linking_url',
          'greeting',
          'persistent_menu',
          'ice_breakers',
          'whitelisted_domains'
        ];
        let profileData = await client.getMessengerProfile(fields);

        return {
          output: {
            success: true,
            profileSettings: profileData
          },
          message: `Retrieved Messenger profile settings for fields: ${fields.join(', ')}.`
        };
      }

      case 'set': {
        let hasUpdates =
          input.getStartedPayload !== undefined ||
          input.accountLinkingUrl !== undefined ||
          input.greetingTexts !== undefined ||
          input.persistentMenu !== undefined ||
          input.iceBreakers !== undefined ||
          input.whitelistedDomains !== undefined;

        if (!hasUpdates) {
          throw messengerServiceError('Provide at least one Messenger profile field to set');
        }

        await client.setMessengerProfile({
          getStartedPayload: input.getStartedPayload,
          accountLinkingUrl: input.accountLinkingUrl,
          greetingTexts: input.greetingTexts,
          persistentMenu: input.persistentMenu,
          iceBreakers: input.iceBreakers,
          whitelistedDomains: input.whitelistedDomains
        });

        let updatedFields: string[] = [];
        if (input.getStartedPayload !== undefined) updatedFields.push('get_started');
        if (input.accountLinkingUrl !== undefined) updatedFields.push('account_linking_url');
        if (input.greetingTexts !== undefined) updatedFields.push('greeting');
        if (input.persistentMenu !== undefined) updatedFields.push('persistent_menu');
        if (input.iceBreakers !== undefined) updatedFields.push('ice_breakers');
        if (input.whitelistedDomains !== undefined) updatedFields.push('whitelisted_domains');

        return {
          output: {
            success: true
          },
          message: `Messenger profile updated: ${updatedFields.join(', ')}.`
        };
      }

      case 'delete': {
        if (!input.fields || input.fields.length === 0) {
          throw messengerServiceError('fields are required for delete action');
        }

        await client.deleteMessengerProfileFields(input.fields);

        return {
          output: {
            success: true
          },
          message: `Deleted Messenger profile fields: ${input.fields.join(', ')}.`
        };
      }
    }
  })
  .build();
