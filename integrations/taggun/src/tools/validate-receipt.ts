import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateReceipt = SlateTool.create(spec, {
  name: 'Validate Receipt',
  key: 'validate_receipt',
  description: `Validate a receipt or invoice against a pre-configured campaign's rules. Checks the receipt against criteria such as eligible merchants, products, purchase dates, and amounts.

Returns whether the validation passed or failed, along with matched products, merchant information, and any fraud detection signals.

Useful for loyalty programs, cashback campaigns, rebate promotions, and warranty verification workflows.`,
  instructions: [
    'A campaign must already exist (use **Manage Campaign** to create one) before validating receipts.',
    'Provide either a `sourceUrl` or base64 `image` with `filename` and `contentType`.'
  ],
  constraints: [
    'Maximum file size is 20MB.',
    'Supported formats: PDF, JPG, PNG, GIF, HEIF/HEIC.',
    'Campaign validation requires the feature to be enabled on your Taggun account.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to validate the receipt against'),
      sourceUrl: z
        .string()
        .optional()
        .describe('HTTPS URL pointing to the receipt or invoice image/PDF'),
      image: z.string().optional().describe('Base64-encoded image content'),
      filename: z
        .string()
        .optional()
        .describe('Filename for the base64 image. Required when using base64.'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the base64 image. Required when using base64.'),
      referenceId: z
        .string()
        .optional()
        .describe('Unique reference ID for tracking this validation'),
      incognito: z
        .boolean()
        .optional()
        .describe('Set true to prevent receipt data from being stored'),
      ipAddress: z.string().optional().describe('End user IP address'),
      near: z
        .string()
        .optional()
        .describe('Geographic location hint (e.g. "New York, NY, US")')
    })
  )
  .output(
    z.object({
      successful: z
        .boolean()
        .describe('Whether the receipt passed all campaign validation checks'),
      passedValidations: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('List of validation checks that passed'),
      failedValidations: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('List of validation checks that failed'),
      totalAmount: z.number().nullable().optional().describe('Total receipt amount'),
      date: z.string().nullable().optional().describe('Receipt date in ISO 8601 format'),
      merchantName: z.string().nullable().optional().describe('Detected merchant name'),
      merchantAddress: z.string().nullable().optional().describe('Merchant address'),
      merchantCity: z.string().nullable().optional().describe('Merchant city'),
      merchantState: z.string().nullable().optional().describe('Merchant state'),
      merchantCountryCode: z.string().nullable().optional().describe('Merchant country code'),
      merchantPostalCode: z.string().nullable().optional().describe('Merchant postal code'),
      receiptNumber: z.string().nullable().optional().describe('Receipt number if detected'),
      invoiceNumber: z.string().nullable().optional().describe('Invoice number if detected'),
      productLineItems: z
        .array(
          z.object({
            name: z.string().nullable().optional(),
            totalPrice: z.number().nullable().optional(),
            quantity: z.number().nullable().optional()
          })
        )
        .nullable()
        .optional()
        .describe('All product line items found on the receipt'),
      matchedProductLineItems: z
        .array(
          z.object({
            name: z.string().nullable().optional(),
            totalPrice: z.number().nullable().optional(),
            quantity: z.number().nullable().optional()
          })
        )
        .nullable()
        .optional()
        .describe('Product line items matching campaign criteria'),
      productCodes: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Product codes found on the receipt'),
      balanceAmount: z.number().nullable().optional().describe('Remaining balance amount'),
      similarReceipts: z
        .array(z.any())
        .nullable()
        .optional()
        .describe('Similar receipts found (fraud detection)'),
      trackingId: z
        .string()
        .nullable()
        .optional()
        .describe('Unique tracking ID for this validation request'),
      smartValidate: z
        .any()
        .nullable()
        .optional()
        .describe('SmartValidate custom validation results'),
      error: z.string().nullable().optional().describe('Error message if validation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let hasUrl = !!ctx.input.sourceUrl;
    let hasBase64 = !!ctx.input.image;

    if (!hasUrl && !hasBase64) {
      throw new Error('Either sourceUrl or image (base64) must be provided.');
    }

    let validationOptions = {
      campaignId: ctx.input.campaignId,
      referenceId: ctx.input.referenceId,
      incognito: ctx.input.incognito,
      ipAddress: ctx.input.ipAddress,
      near: ctx.input.near
    };

    let result: any;

    if (hasUrl) {
      result = await client.validateReceiptFromUrl(ctx.input.sourceUrl!, validationOptions);
    } else {
      if (!ctx.input.filename || !ctx.input.contentType) {
        throw new Error(
          'filename and contentType are required when using base64 image input.'
        );
      }
      result = await client.validateReceiptFromBase64(
        {
          image: ctx.input.image!,
          filename: ctx.input.filename,
          contentType: ctx.input.contentType
        },
        validationOptions
      );
    }

    let output = {
      successful: result.successful ?? false,
      passedValidations: result.passedValidations ?? null,
      failedValidations: result.failedValidations ?? null,
      totalAmount: result.totalAmount ?? null,
      date: result.date ?? null,
      merchantName: result.merchantName ?? null,
      merchantAddress: result.merchantAddress ?? null,
      merchantCity: result.merchantCity ?? null,
      merchantState: result.merchantState ?? null,
      merchantCountryCode: result.merchantCountryCode ?? null,
      merchantPostalCode: result.merchantPostalCode ?? null,
      receiptNumber: result.receiptNumber ?? null,
      invoiceNumber: result.invoiceNumber ?? null,
      productLineItems: result.productLineItems ?? null,
      matchedProductLineItems: result.matchedProductLineItems ?? null,
      productCodes: result.productCodes ?? null,
      balanceAmount: result.balanceAmount ?? null,
      similarReceipts: result.similarReceipts ?? null,
      trackingId: result.trackingId ?? null,
      smartValidate: result.smartValidate ?? null,
      error: result.error ?? null
    };

    let messageParts: string[] = [];
    messageParts.push(`**Validation:** ${output.successful ? 'PASSED' : 'FAILED'}`);
    if (output.merchantName) messageParts.push(`**Merchant:** ${output.merchantName}`);
    if (output.totalAmount !== null) messageParts.push(`**Total:** ${output.totalAmount}`);
    if (output.passedValidations?.length)
      messageParts.push(`**Passed checks:** ${output.passedValidations.length}`);
    if (output.failedValidations?.length)
      messageParts.push(`**Failed checks:** ${output.failedValidations.join(', ')}`);
    if (output.matchedProductLineItems?.length)
      messageParts.push(`**Matched products:** ${output.matchedProductLineItems.length}`);

    return {
      output,
      message: messageParts.join('\n')
    };
  })
  .build();
