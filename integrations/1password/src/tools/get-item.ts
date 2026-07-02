import { SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.string().describe('Unique identifier of the field'),
  label: z.string().describe('Label/name of the field'),
  value: z.string().optional().describe('Value of the field'),
  type: z.string().describe('Field type (e.g., STRING, CONCEALED, URL, EMAIL, OTP)'),
  purpose: z
    .string()
    .optional()
    .describe('Purpose of the field (e.g., USERNAME, PASSWORD, NOTES)'),
  sectionId: z.string().optional().describe('ID of the section this field belongs to'),
  sectionLabel: z.string().optional().describe('Label of the section this field belongs to'),
  totp: z
    .string()
    .optional()
    .describe('Current TOTP code if the field is a one-time password'),
  reference: z.string().optional().describe('Secret reference URI (op://vault/item/field)')
});

let fileSchema = z.object({
  fileId: z.string().describe('Unique identifier of the file'),
  name: z.string().describe('Filename'),
  size: z.number().describe('File size in bytes'),
  contentPath: z.string().optional().describe('API path to retrieve file content')
});

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve the full details of a specific item from a vault, including all fields, sections, files, and metadata. Use this to read passwords, API keys, notes, and other secrets stored in 1Password.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault containing the item'),
      itemId: z.string().describe('ID of the item to retrieve')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique identifier of the item'),
      title: z.string().describe('Title of the item'),
      category: z
        .string()
        .describe('Category (e.g., LOGIN, PASSWORD, API_CREDENTIAL, SECURE_NOTE)'),
      vaultId: z.string().describe('ID of the vault containing the item'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the item'),
      favorite: z.boolean().optional().describe('Whether the item is a favorite'),
      createdAt: z.string().describe('When the item was created'),
      updatedAt: z.string().describe('When the item was last updated'),
      fields: z
        .array(fieldSchema)
        .describe('All fields on the item including credentials and custom fields'),
      files: z.array(fileSchema).optional().describe('File attachments on the item'),
      urls: z
        .array(
          z.object({
            href: z.string().describe('The URL'),
            primary: z.boolean().optional().describe('Whether this is the primary URL'),
            label: z.string().optional().describe('Label for the URL')
          })
        )
        .optional()
        .describe('URLs associated with the item')
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Fetching item details...');
    let item = await client.getItem(ctx.input.vaultId, ctx.input.itemId);

    let fields = (item.fields || []).map(f => ({
      fieldId: f.id,
      label: f.label,
      value: f.value,
      type: f.type,
      purpose: f.purpose,
      sectionId: f.section?.id,
      sectionLabel: f.section?.label,
      totp: f.totp,
      reference: f.reference
    }));

    let files = (item.files || []).map(f => ({
      fileId: f.id,
      name: f.name,
      size: f.size,
      contentPath: f.contentPath ?? f.content_path
    }));

    return {
      output: {
        itemId: item.id,
        title: item.title,
        category: item.category,
        vaultId: item.vault.id,
        tags: item.tags,
        favorite: item.favorite,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        fields,
        files: files.length > 0 ? files : undefined,
        urls: item.urls
      },
      message: `Retrieved item **${item.title}** (${item.category}) with ${fields.length} field(s)${files.length > 0 ? ` and ${files.length} file(s)` : ''}.`
    };
  })
  .build();
