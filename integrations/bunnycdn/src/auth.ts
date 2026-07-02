import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Account API Key for the Core Platform API (pull zones, DNS, billing, statistics, video libraries)'
        ),
      storageToken: z
        .string()
        .optional()
        .describe(
          'Storage Zone Password for the Edge Storage API. Required for storage file operations.'
        ),
      streamToken: z
        .string()
        .optional()
        .describe(
          'Stream Library API Key for the Stream Video API. Required for video management operations.'
        )
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',
    inputSchema: z.object({
      accountApiKey: z
        .string()
        .describe(
          'Your Account API Key from the bunny.net dashboard (Profile > Edit account details > API Key). Required for all core API operations.'
        ),
      storageZonePassword: z
        .string()
        .optional()
        .describe(
          'Your Storage Zone Password (Dashboard > Storage > Zone Name > FTP & API Access > Password). Required only for Edge Storage file operations.'
        ),
      streamLibraryApiKey: z
        .string()
        .optional()
        .describe(
          'Your Stream Library API Key (Dashboard > Stream > Library > API). Required only for video management operations.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.accountApiKey,
          storageToken: ctx.input.storageZonePassword,
          streamToken: ctx.input.streamLibraryApiKey
        }
      };
    }
  });
