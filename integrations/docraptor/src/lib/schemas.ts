import { z } from 'zod';

export let princeOptionsSchema = z
  .object({
    media: z
      .enum(['print', 'screen'])
      .optional()
      .describe(
        'CSS media type to apply. Use "screen" for web-style layouts, "print" for print-optimized layouts. Defaults to "print".'
      ),
    baseurl: z
      .string()
      .optional()
      .describe('Base URL for resolving relative URLs in the document content.'),
    input: z
      .enum(['html', 'xml', 'auto'])
      .optional()
      .describe('Input format type. Defaults to auto-detection.'),
    javascript: z
      .boolean()
      .optional()
      .describe(
        "Enable Prince's native JavaScript engine (separate from DocRaptor's JS engine)."
      ),
    maxPasses: z.number().optional().describe('Maximum number of document layout passes.'),
    encrypt: z.boolean().optional().describe('Enable PDF encryption.'),
    keyBits: z
      .union([z.literal(40), z.literal(128)])
      .optional()
      .describe('Encryption key size: 40 or 128 bits.'),
    userPassword: z.string().optional().describe('Password required to open the PDF.'),
    ownerPassword: z
      .string()
      .optional()
      .describe('Password required to modify PDF permissions.'),
    disallowPrint: z.boolean().optional().describe('Restrict printing of the PDF.'),
    disallowCopy: z.boolean().optional().describe('Restrict copying content from the PDF.'),
    disallowAnnotate: z
      .boolean()
      .optional()
      .describe('Restrict adding annotations to the PDF.'),
    disallowModify: z.boolean().optional().describe('Restrict modifying the PDF.'),
    allowCopyForAccessibility: z
      .boolean()
      .optional()
      .describe('Allow copying for accessibility purposes even when copying is disallowed.'),
    allowAssembly: z
      .boolean()
      .optional()
      .describe('Allow document assembly when modifications are restricted.'),
    noNetwork: z
      .boolean()
      .optional()
      .describe('Disable all HTTP downloads during conversion.'),
    noParallelDownloads: z
      .boolean()
      .optional()
      .describe('Fetch external assets sequentially rather than in parallel.'),
    httpTimeout: z
      .number()
      .optional()
      .describe('Timeout in seconds for downloading external resources (1-60).'),
    insecure: z
      .boolean()
      .optional()
      .describe('Skip SSL certificate verification for external resources.'),
    noEmbedFonts: z.boolean().optional().describe('Do not embed fonts in the PDF.'),
    noSubsetFonts: z.boolean().optional().describe('Do not subset embedded fonts.'),
    noCompress: z.boolean().optional().describe('Disable PDF compression.'),
    cssDpi: z.number().optional().describe('DPI for CSS units (e.g. 96, 72, 200).'),
    profile: z
      .string()
      .optional()
      .describe('PDF profile for compliance (e.g. "PDF/A-1b", "PDF/UA-1", "PDF/X-3:2003").'),
    pdfTitle: z.string().optional().describe('Document metadata title.')
  })
  .optional()
  .describe('Advanced PDF rendering options powered by Prince.');

export let baseDocumentInputSchema = z.object({
  name: z
    .string()
    .optional()
    .describe('Name to identify this document in logs and document listing.'),
  documentType: z.enum(['pdf', 'xls', 'xlsx']).describe('Output document format.'),
  documentContent: z
    .string()
    .optional()
    .describe('HTML or XML content to convert. Required unless documentUrl is provided.'),
  documentUrl: z
    .string()
    .optional()
    .describe(
      'URL to fetch content from for conversion. Required unless documentContent is provided.'
    ),
  test: z
    .boolean()
    .optional()
    .describe(
      'Create document in test mode. Test documents are watermarked but do not count against monthly limits.'
    ),
  javascript: z
    .boolean()
    .optional()
    .describe(
      "Enable DocRaptor's JavaScript engine for processing. Disabled by default to speed up creation."
    ),
  referrer: z
    .string()
    .optional()
    .describe('HTTP referrer to use when fetching the document URL.'),
  pipeline: z
    .string()
    .optional()
    .describe('Prince engine version to use (e.g. "6", "7", "8", "9", "9.2", "10", "10.1").'),
  tag: z
    .string()
    .optional()
    .describe('Arbitrary tag string for identifying or categorizing the document.'),
  strict: z.enum(['none', 'html']).optional().describe('HTML validation strictness level.'),
  ignoreResourceErrors: z
    .boolean()
    .optional()
    .describe(
      'Continue conversion even if external resources (CSS, images) fail to download.'
    ),
  ignoreConsoleMessages: z
    .boolean()
    .optional()
    .describe('Suppress JavaScript console.log errors.'),
  princeOptions: princeOptionsSchema
});
