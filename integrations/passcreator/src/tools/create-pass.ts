import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPass = SlateTool.create(spec, {
  name: 'Create Pass',
  key: 'create_pass',
  description: `Create a new wallet pass from a template. The pass can be personalized with custom field values, barcode, expiration dates, locations, and stored values (e.g., loyalty points). Optionally sends the pass directly via email or SMS.`,
  instructions: [
    'Custom fields should use the field keys defined in the template.',
    'Dates must be in "Y-m-d H:i" format (e.g., "2025-12-31 23:59").',
    'Set asyncProcessing to false to receive the barcodeValue in the response (synchronous mode).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe('Identifier of the pass template to create the pass from'),
      userProvidedId: z
        .string()
        .optional()
        .describe(
          'Custom identifier for the pass (must be unique if enforceUniqueUserProvidedId is true)'
        ),
      enforceUniqueUserProvidedId: z
        .boolean()
        .optional()
        .describe('Reject creation if userProvidedId already exists'),
      barcodeValue: z
        .string()
        .optional()
        .describe('Custom barcode value; if not set, a value is auto-generated'),
      expirationDate: z.string().optional().describe('Expiration date in "Y-m-d H:i" format'),
      relevantDate: z
        .string()
        .optional()
        .describe('Relevant date shown on the lock screen in "Y-m-d H:i" format'),
      storedValue: z
        .number()
        .optional()
        .describe('Stored monetary value (e.g., for loyalty points or gift card balance)'),
      emailRecipient: z
        .string()
        .optional()
        .describe('Email address to automatically send the pass to'),
      phoneRecipient: z
        .string()
        .optional()
        .describe('Phone number to automatically send the pass via SMS'),
      locations: z
        .array(
          z.object({
            latitude: z.number().describe('Latitude coordinate'),
            longitude: z.number().describe('Longitude coordinate'),
            relevantText: z
              .string()
              .optional()
              .describe('Text shown in the lock screen notification at this location')
          })
        )
        .optional()
        .describe('Location-based notification triggers'),
      labelColor: z.string().optional().describe('Hex color for field labels'),
      foregroundColor: z.string().optional().describe('Hex color for field values'),
      backgroundColor: z.string().optional().describe('Hex color for the pass background'),
      groupingIdentifier: z
        .string()
        .optional()
        .describe('Grouping identifier for stacking passes in Apple Wallet'),
      downloadPin: z.string().optional().describe('PIN required to download the pass'),
      bundleId: z
        .string()
        .optional()
        .describe('Bundle ID to add this pass to an existing bundle'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by field key as defined in the template'),
      asyncProcessing: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Process asynchronously (true) or synchronously (false, returns barcodeValue)'
        )
    })
  )
  .output(
    z.object({
      passId: z.string().describe('Unique identifier of the created pass'),
      downloadPage: z.string().optional().describe('URL to the pass download page'),
      barcodeValue: z
        .string()
        .optional()
        .describe('Barcode value (only returned in synchronous mode)'),
      iPhoneUri: z.string().optional().describe('Direct download URI for Apple Wallet'),
      androidUri: z.string().optional().describe('Direct download URI for Google Wallet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      templateId: ctx.input.templateId
    };

    if (ctx.input.userProvidedId) body.userProvidedId = ctx.input.userProvidedId;
    if (ctx.input.enforceUniqueUserProvidedId !== undefined)
      body.enforceUniqueUserProvidedId = ctx.input.enforceUniqueUserProvidedId;
    if (ctx.input.barcodeValue) body.barcodeValue = ctx.input.barcodeValue;
    if (ctx.input.expirationDate) body.expirationDate = ctx.input.expirationDate;
    if (ctx.input.relevantDate) body.relevantDate = ctx.input.relevantDate;
    if (ctx.input.storedValue !== undefined) body.storedValue = ctx.input.storedValue;
    if (ctx.input.emailRecipient) body.emailRecipient = ctx.input.emailRecipient;
    if (ctx.input.phoneRecipient) body.phoneRecipient = ctx.input.phoneRecipient;
    if (ctx.input.locations) body.locations = ctx.input.locations;
    if (ctx.input.labelColor) body.labelColor = ctx.input.labelColor;
    if (ctx.input.foregroundColor) body.foregroundColor = ctx.input.foregroundColor;
    if (ctx.input.backgroundColor) body.backgroundColor = ctx.input.backgroundColor;
    if (ctx.input.groupingIdentifier) body.groupingIdentifier = ctx.input.groupingIdentifier;
    if (ctx.input.downloadPin) body.downloadPin = ctx.input.downloadPin;
    if (ctx.input.bundleId) body.bundleId = ctx.input.bundleId;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        body[key] = value;
      }
    }

    let result = await client.createPass(body, ctx.input.asyncProcessing);
    let data = result.data || result;

    return {
      output: {
        passId: data.identifier,
        downloadPage: data.downloadPage,
        barcodeValue: data.barcodeValue || undefined,
        iPhoneUri: data.iPhoneUri,
        androidUri: data.androidUri
      },
      message: `Created pass \`${data.identifier}\`${ctx.input.emailRecipient ? ` and sent to ${ctx.input.emailRecipient}` : ''}${ctx.input.phoneRecipient ? ` and sent via SMS to ${ctx.input.phoneRecipient}` : ''}.`
    };
  })
  .build();
