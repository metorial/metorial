import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let createItem = SlateTool.create(spec, {
  name: 'Create Item',
  key: 'create_item',
  description: `Create a new item in a 1Password vault. Supports creating logins, passwords, API credentials, secure notes, and other item types with custom fields, sections, URLs, and tags.`,
  instructions: [
    'The category must be a valid 1Password item category such as LOGIN, PASSWORD, API_CREDENTIAL, SECURE_NOTE, CREDIT_CARD, IDENTITY, SSH_KEY, or DATABASE.',
    'Fields with purpose USERNAME and PASSWORD are used for login items. Set the type to CONCEALED for sensitive values.',
    'To organize fields into sections, provide matching sectionId values on both the sections and fields arrays.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault to create the item in'),
      title: z.string().optional().describe('Title for the new item'),
      category: z
        .string()
        .describe(
          'Item category: LOGIN, PASSWORD, API_CREDENTIAL, SECURE_NOTE, CREDIT_CARD, IDENTITY, SSH_KEY, DATABASE, etc.'
        ),
      tags: z.array(z.string()).optional().describe('Tags to assign to the item'),
      favorite: z.boolean().optional().describe('Whether to mark the item as a favorite'),
      urls: z
        .array(
          z.object({
            href: z.string().describe('The URL'),
            primary: z.boolean().optional().describe('Whether this is the primary URL'),
            label: z.string().optional().describe('Label for the URL')
          })
        )
        .optional()
        .describe('URLs to associate with the item'),
      sections: z
        .array(
          z.object({
            sectionId: z.string().describe('Unique ID for the section'),
            label: z.string().optional().describe('Display label for the section')
          })
        )
        .optional()
        .describe('Sections to organize fields into'),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Label/name for the field'),
            value: z.string().optional().describe('Value of the field'),
            type: z
              .enum([
                'STRING',
                'CONCEALED',
                'URL',
                'EMAIL',
                'DATE',
                'MONTH_YEAR',
                'MENU',
                'OTP',
                'PHONE',
                'ADDRESS',
                'REFERENCE'
              ])
              .default('STRING')
              .describe('Field type'),
            purpose: z
              .enum(['USERNAME', 'PASSWORD', 'NOTES', ''])
              .optional()
              .describe('Field purpose for login items'),
            sectionId: z
              .string()
              .optional()
              .describe('ID of the section this field belongs to'),
            generate: z
              .boolean()
              .optional()
              .describe('Whether to generate a value for this field (e.g., for passwords)')
          })
        )
        .optional()
        .describe('Fields to add to the item')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the created item'),
      title: z.string().describe('Title of the created item'),
      category: z.string().describe('Category of the created item'),
      vaultId: z.string().describe('ID of the vault containing the item'),
      createdAt: z.string().describe('When the item was created')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.connectServerUrl) {
      throw new Error('Connect server URL is required. Set it in the configuration.');
    }

    let client = new ConnectClient({
      token: ctx.auth.token,
      serverUrl: ctx.config.connectServerUrl
    });

    let sections = (ctx.input.sections || []).map(s => ({
      id: s.sectionId,
      label: s.label
    }));

    let fields = (ctx.input.fields || []).map(f => ({
      label: f.label,
      value: f.value,
      type: f.type,
      purpose: f.purpose || undefined,
      generate: f.generate,
      section: f.sectionId ? { id: f.sectionId } : undefined
    }));

    ctx.progress('Creating item...');
    let created = await client.createItem(ctx.input.vaultId, {
      vault: { id: ctx.input.vaultId },
      title: ctx.input.title,
      category: ctx.input.category,
      tags: ctx.input.tags,
      favorite: ctx.input.favorite,
      urls: ctx.input.urls,
      sections,
      fields
    });

    return {
      output: {
        itemId: created.id,
        title: created.title,
        category: created.category,
        vaultId: created.vault.id,
        createdAt: created.createdAt
      },
      message: `Created item **${created.title}** (${created.category}) in vault \`${created.vault.id}\`.`
    };
  })
  .build();
