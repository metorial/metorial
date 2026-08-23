import { z } from 'zod';
import { commandSchema } from '../interactions/command';

export let chatSetupManifestSchema = z.object({
  type: z
    .string()
    .describe(
      'Manifest format, e.g. "Slack App Manifest", "Microsoft Teams App Manifest", "Google Chat App Config", "Discord Application"'
    ),
  value: z
    .string()
    .describe('Manifest contents as text (YAML, JSON, or other provider format)'),
  format: z
    .enum(['yaml', 'json', 'text'])
    .optional()
    .describe('How to interpret value when it is not obvious from type'),
  filename: z
    .string()
    .optional()
    .describe(
      'Suggested filename when downloading or pasting the manifest, e.g. manifest.yaml'
    )
});

export type ChatSetupManifest = z.infer<typeof chatSetupManifestSchema>;

export let chatSetupLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  description: z.string().optional()
});

export type ChatSetupLink = z.infer<typeof chatSetupLinkSchema>;

export let chatSetupInputSchema = z.object({
  appName: z.string().optional().describe('Display name of the app as shown to users'),
  botName: z
    .string()
    .optional()
    .describe('Bot username or display name when it differs from appName'),
  description: z.string().optional().describe('Short description of the app'),
  webhookUrl: z
    .string()
    .optional()
    .describe(
      'HTTPS endpoint that should receive events, slash commands, and interactivity payloads'
    ),
  redirectUris: z
    .array(z.string())
    .optional()
    .describe('OAuth redirect URIs to register with the provider'),
  commands: z
    .array(commandSchema)
    .optional()
    .describe('Slash commands to register. Name should not include a leading slash.'),
  interactivity: z
    .boolean()
    .optional()
    .describe('Whether buttons, selects, and modals should be enabled')
});

export type ChatSetupInput = z.infer<typeof chatSetupInputSchema>;

export let chatSetupOutputSchema = z.object({
  setupMarkdown: z
    .string()
    .describe('Human-readable setup instructions in Markdown for the developer console'),
  title: z.string().optional().describe('Short title for the setup instructions'),
  manifest: chatSetupManifestSchema
    .optional()
    .describe('Optional provider-specific app manifest to import, e.g. a Slack app manifest'),
  links: z
    .array(chatSetupLinkSchema)
    .optional()
    .describe('Console or docs links the user should open while setting up the app'),
  warnings: z
    .array(z.string())
    .optional()
    .describe('Caveats or extra steps that are easy to miss')
});

export type ChatSetupOutput = z.infer<typeof chatSetupOutputSchema>;
