import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let confidenceFieldSchema = z
  .object({
    value: z.number().nullable().optional().describe('Extracted value'),
    confidenceLevel: z.number().nullable().optional().describe('Confidence score from 0 to 1')
  })
  .optional();

let confidenceStringFieldSchema = z
  .object({
    value: z.string().nullable().optional().describe('Extracted value'),
    confidenceLevel: z.number().nullable().optional().describe('Confidence score from 0 to 1')
  })
  .optional();

let lineItemSchema = z
  .object({
    name: z.string().nullable().optional().describe('Product or item name'),
    quantity: z.number().nullable().optional().describe('Item quantity'),
    unitPrice: z.number().nullable().optional().describe('Price per unit'),
    totalPrice: z.number().nullable().optional().describe('Total price for this line item'),
    confidenceLevel: z.number().nullable().optional().describe('Confidence score')
  })
  .optional();

export let extractReceipt = SlateTool.create(spec, {
  name: 'Extract Receipt Data',
  key: 'extract_receipt',
  description: `Extract structured data from a receipt or invoice image using OCR and machine learning. Supports submission via **URL** or **base64-encoded image**.

Returns merchant details, amounts, dates, and optionally line items, tax breakdowns, fraud detection signals, and more depending on the detail level chosen.

Use **simple** mode for core fields (total, tax, date, merchant) or **verbose** mode for full extraction including line items, invoice/receipt numbers, QR codes, VAT verification, and tampering detection.`,
  instructions: [
    'Provide either a `sourceUrl` or base64 `image` with `filename` and `contentType` — not both.',
    'Set `detailLevel` to "verbose" if you need line items, invoice numbers, or fraud detection fields.',
    'Use the `language` hint if you know the receipt language; otherwise auto-detection is used.'
  ],
  constraints: [
    'Maximum file size is 20MB.',
    'Supported formats: PDF, JPG, PNG, GIF, HEIF/HEIC.',
    'URL sources must use HTTPS.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z
        .string()
        .optional()
        .describe('HTTPS URL pointing to the receipt or invoice image/PDF'),
      image: z.string().optional().describe('Base64-encoded image content'),
      filename: z
        .string()
        .optional()
        .describe(
          'Filename for the base64 image (e.g. "receipt.jpg"). Required when using base64 image.'
        ),
      contentType: z
        .string()
        .optional()
        .describe(
          'MIME type of the base64 image (e.g. "image/jpeg", "application/pdf"). Required when using base64 image.'
        ),
      customHeaderKey: z
        .string()
        .optional()
        .describe('Custom header value to send with URL requests (x-custom-key)'),
      detailLevel: z
        .enum(['simple', 'verbose'])
        .default('verbose')
        .describe(
          'Response detail level. "simple" returns core fields; "verbose" includes line items, entities, and full metadata.'
        ),
      extractLineItems: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to extract product line items (verbose mode only)'),
      extractTime: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to extract the time from the receipt'),
      language: z
        .string()
        .optional()
        .describe(
          'Language hint for OCR (e.g. "en", "es", "fr", "jp", "zh"). Leave empty for auto-detection.'
        ),
      near: z
        .string()
        .optional()
        .describe(
          'Geographic location hint for merchant search (e.g. "San Francisco, CA, US")'
        ),
      ignoreMerchantName: z
        .string()
        .optional()
        .describe(
          'Merchant name to exclude from detection, useful to avoid detecting customer name as merchant'
        ),
      incognito: z
        .boolean()
        .optional()
        .describe('Set true to prevent receipt data from being stored'),
      refresh: z
        .boolean()
        .optional()
        .describe('Set true to force re-processing of a previously submitted receipt'),
      referenceId: z
        .string()
        .optional()
        .describe('Unique reference ID for feedback and training purposes'),
      subAccountId: z
        .string()
        .optional()
        .describe('Sub-account identifier for billing purposes'),
      ipAddress: z.string().optional().describe('End user IP address for geolocation')
    })
  )
  .output(
    z.object({
      totalAmount: confidenceFieldSchema.describe('Total receipt/invoice amount'),
      taxAmount: confidenceFieldSchema.describe('Tax amount'),
      date: z
        .object({
          value: z.string().nullable().optional().describe('Extracted date string'),
          confidenceLevel: z.number().nullable().optional().describe('Confidence score')
        })
        .optional()
        .describe('Date of purchase'),
      merchantName: confidenceStringFieldSchema.describe('Merchant/store name'),
      merchantAddress: confidenceStringFieldSchema.describe('Merchant address'),
      merchantCity: confidenceStringFieldSchema.describe('Merchant city'),
      merchantState: confidenceStringFieldSchema.describe('Merchant state or province'),
      merchantCountryCode: confidenceStringFieldSchema.describe('Merchant ISO country code'),
      merchantPostalCode: confidenceStringFieldSchema.describe('Merchant postal/zip code'),
      merchantTypes: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Merchant category types'),
      confidenceLevel: z
        .number()
        .nullable()
        .optional()
        .describe('Overall extraction confidence (0-1)'),
      currencyCode: z.string().nullable().optional().describe('Detected currency code'),
      paymentType: confidenceStringFieldSchema.describe('Payment method used'),
      lineItems: z
        .array(lineItemSchema)
        .nullable()
        .optional()
        .describe('Extracted product line items (verbose mode)'),
      receiptNumber: z
        .string()
        .nullable()
        .optional()
        .describe('Receipt number (verbose mode)'),
      invoiceNumber: z
        .string()
        .nullable()
        .optional()
        .describe('Invoice number (verbose mode)'),
      rawText: z
        .string()
        .nullable()
        .optional()
        .describe('Full OCR text extracted from the receipt'),
      tamperDetection: z
        .object({
          isTampered: z.boolean().nullable().optional(),
          tamperedScore: z.number().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Tampering detection results (if enabled)'),
      handwritingDetection: z
        .object({
          isHandwritten: z.boolean().nullable().optional(),
          handwrittenScore: z.number().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Handwritten receipt detection (if enabled)'),
      qrCodeData: z
        .string()
        .nullable()
        .optional()
        .describe('Data extracted from QR code (if enabled and present)'),
      iban: z.string().nullable().optional().describe('IBAN number if detected'),
      merchantTaxId: z
        .string()
        .nullable()
        .optional()
        .describe('Merchant tax/VAT ID if detected'),
      vatVerification: z
        .object({
          vatNumber: z.string().nullable().optional(),
          countryCode: z.string().nullable().optional(),
          name: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          valid: z.boolean().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('VIES VAT verification result (if applicable)'),
      multiTaxLineItems: z
        .array(
          z.object({
            taxAmount: z.number().nullable().optional(),
            netAmount: z.number().nullable().optional(),
            grossAmount: z.number().nullable().optional(),
            taxRate: z.number().nullable().optional(),
            taxType: z.string().nullable().optional()
          })
        )
        .nullable()
        .optional()
        .describe('Multi-tier tax breakdown (verbose mode)'),
      expenseType: z.string().nullable().optional().describe('Expense type classification'),
      masterCategory: z.string().nullable().optional().describe('Master spending category'),
      elapsed: z.number().nullable().optional().describe('Processing time in milliseconds'),
      error: z.string().nullable().optional().describe('Error message if extraction failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let hasUrl = !!ctx.input.sourceUrl;
    let hasBase64 = !!ctx.input.image;

    if (!hasUrl && !hasBase64) {
      throw new Error('Either sourceUrl or image (base64) must be provided.');
    }

    let options = {
      refresh: ctx.input.refresh,
      incognito: ctx.input.incognito,
      extractTime: ctx.input.extractTime,
      extractLineItems: ctx.input.extractLineItems,
      ipAddress: ctx.input.ipAddress,
      near: ctx.input.near,
      language: ctx.input.language,
      ignoreMerchantName: ctx.input.ignoreMerchantName,
      subAccountId: ctx.input.subAccountId,
      referenceId: ctx.input.referenceId
    };

    let isVerbose = ctx.input.detailLevel === 'verbose';
    let result: any;

    if (hasUrl) {
      let urlInput = {
        url: ctx.input.sourceUrl!,
        customHeaderKey: ctx.input.customHeaderKey
      };
      result = isVerbose
        ? await client.extractReceiptVerboseFromUrl(urlInput, options)
        : await client.extractReceiptSimpleFromUrl(urlInput, options);
    } else {
      if (!ctx.input.filename || !ctx.input.contentType) {
        throw new Error(
          'filename and contentType are required when using base64 image input.'
        );
      }
      let base64Input = {
        image: ctx.input.image!,
        filename: ctx.input.filename,
        contentType: ctx.input.contentType
      };
      result = isVerbose
        ? await client.extractReceiptVerboseFromBase64(base64Input, options)
        : await client.extractReceiptSimpleFromBase64(base64Input, options);
    }

    let output = mapExtractionResult(result, isVerbose);

    let messageParts: string[] = [];
    if (output.merchantName?.value)
      messageParts.push(`**Merchant:** ${output.merchantName.value}`);
    if (output.totalAmount?.value !== undefined && output.totalAmount?.value !== null) {
      messageParts.push(`**Total:** ${output.currencyCode || ''} ${output.totalAmount.value}`);
    }
    if (output.date?.value) messageParts.push(`**Date:** ${output.date.value}`);
    if (output.confidenceLevel !== undefined && output.confidenceLevel !== null) {
      messageParts.push(`**Confidence:** ${(output.confidenceLevel * 100).toFixed(1)}%`);
    }
    if (output.lineItems && output.lineItems.length > 0) {
      messageParts.push(`**Line items:** ${output.lineItems.length} extracted`);
    }
    if (output.error) messageParts.push(`**Error:** ${output.error}`);

    return {
      output,
      message:
        messageParts.length > 0
          ? `Receipt extracted successfully.\n${messageParts.join('\n')}`
          : 'Receipt extraction completed.'
    };
  })
  .build();

let mapExtractionResult = (raw: any, isVerbose: boolean) => {
  let totalAmount = raw.totalAmount
    ? {
        value: raw.totalAmount.data ?? null,
        confidenceLevel: raw.totalAmount.confidenceLevel ?? null
      }
    : undefined;

  let taxAmount = raw.taxAmount
    ? {
        value: raw.taxAmount.data ?? null,
        confidenceLevel: raw.taxAmount.confidenceLevel ?? null
      }
    : undefined;

  let date = raw.date
    ? {
        value: raw.date.data ?? null,
        confidenceLevel: raw.date.confidenceLevel ?? null
      }
    : undefined;

  let merchantName = raw.merchantName
    ? {
        value: raw.merchantName.data ?? null,
        confidenceLevel: raw.merchantName.confidenceLevel ?? null
      }
    : undefined;

  let merchantAddress = raw.merchantAddress
    ? {
        value: raw.merchantAddress.data ?? null,
        confidenceLevel: raw.merchantAddress.confidenceLevel ?? null
      }
    : undefined;

  let merchantCity = raw.merchantCity
    ? {
        value: raw.merchantCity.data ?? null,
        confidenceLevel: raw.merchantCity.confidenceLevel ?? null
      }
    : undefined;

  let merchantState = raw.merchantState
    ? {
        value: raw.merchantState.data ?? null,
        confidenceLevel: raw.merchantState.confidenceLevel ?? null
      }
    : undefined;

  let merchantCountryCode = raw.merchantCountryCode
    ? {
        value: raw.merchantCountryCode.data ?? null,
        confidenceLevel: raw.merchantCountryCode.confidenceLevel ?? null
      }
    : undefined;

  let merchantPostalCode = raw.merchantPostalCode
    ? {
        value: raw.merchantPostalCode.data ?? null,
        confidenceLevel: raw.merchantPostalCode.confidenceLevel ?? null
      }
    : undefined;

  let merchantTypes = raw.merchantTypes?.data ?? null;

  let currencyCode = raw.totalAmount?.currencyCode ?? null;

  let paymentType = raw.paymentType
    ? {
        value: raw.paymentType.data ?? null,
        confidenceLevel: raw.paymentType.confidenceLevel ?? null
      }
    : undefined;

  let lineItems = null as any;
  let receiptNumber = null as string | null;
  let invoiceNumber = null as string | null;
  let rawText = null as string | null;
  let tamperDetection = null as any;
  let handwritingDetection = null as any;
  let qrCodeData = null as string | null;
  let iban = null as string | null;
  let merchantTaxId = null as string | null;
  let vatVerification = null as any;
  let multiTaxLineItems = null as any;
  let expenseType = null as string | null;
  let masterCategory = null as string | null;

  if (isVerbose && raw.entities) {
    let entities = raw.entities;

    if (entities.productLineItems && Array.isArray(entities.productLineItems)) {
      lineItems = entities.productLineItems.map((item: any) => ({
        name: item.data?.name?.data ?? item.data?.name?.text ?? null,
        quantity: item.data?.quantity?.data ?? null,
        unitPrice: item.data?.unitPrice?.data ?? null,
        totalPrice: item.data?.totalPrice?.data ?? null,
        confidenceLevel: item.confidenceLevel ?? null
      }));
    }

    receiptNumber = entities.receiptNumber?.data ?? null;
    invoiceNumber = entities.invoiceNumber?.data ?? null;

    if (entities.tamperDetection?.data) {
      tamperDetection = {
        isTampered: entities.tamperDetection.data.isTampered ?? null,
        tamperedScore: entities.tamperDetection.data.tamperedScore ?? null
      };
    }

    if (entities.handwritingDetection?.data) {
      handwritingDetection = {
        isHandwritten: entities.handwritingDetection.data.isHandwritten ?? null,
        handwrittenScore: entities.handwritingDetection.data.handwrittenScore ?? null
      };
    }

    qrCodeData = entities.qrCodeData?.data ?? null;
    iban = entities.IBAN?.data ?? null;
    merchantTaxId = entities.fapiaoMerchantTaxId?.data ?? null;

    if (entities.merchantVerification?.data?.vies) {
      let vies = entities.merchantVerification.data.vies;
      vatVerification = {
        vatNumber: vies.vatNumber ?? null,
        countryCode: vies.countryCode ?? null,
        name: vies.name ?? null,
        address: vies.address ?? null,
        valid: vies.valid ?? null
      };
    }

    if (entities.multiTaxLineItems && Array.isArray(entities.multiTaxLineItems)) {
      multiTaxLineItems = entities.multiTaxLineItems.map((item: any) => ({
        taxAmount: item.data?.taxAmount?.data ?? null,
        netAmount: item.data?.netAmount?.data ?? null,
        grossAmount: item.data?.grossAmount?.data ?? null,
        taxRate: item.data?.taxRate?.data ?? null,
        taxType: item.data?.taxType?.data ?? null
      }));
    }

    expenseType = entities.expenseType?.data ?? null;
    masterCategory = entities.masterCategory?.data ?? null;
  }

  if (isVerbose && raw.text) {
    rawText = raw.text.text ?? null;
  }

  return {
    totalAmount,
    taxAmount,
    date,
    merchantName,
    merchantAddress,
    merchantCity,
    merchantState,
    merchantCountryCode,
    merchantPostalCode,
    merchantTypes,
    confidenceLevel: raw.confidenceLevel ?? null,
    currencyCode,
    paymentType,
    lineItems,
    receiptNumber,
    invoiceNumber,
    rawText,
    tamperDetection,
    handwritingDetection,
    qrCodeData,
    iban,
    merchantTaxId,
    vatVerification,
    multiTaxLineItems,
    expenseType,
    masterCategory,
    elapsed: raw.elapsed ?? null,
    error: raw.error ?? null
  };
};
