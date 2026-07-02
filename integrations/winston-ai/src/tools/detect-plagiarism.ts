import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectPlagiarism = SlateTool.create(spec, {
  name: 'Detect Plagiarism',
  key: 'detect_plagiarism',
  description: `Scans text content against internet sources to identify duplicate or similar content. Returns an overall plagiarism score, matched sources with URLs and titles, word-level match details (identical vs. similar), citation detection, and obfuscation attack detection.

Accepts plain text, a publicly accessible file URL (.pdf, .doc, .docx), or a website URL. Supports 45+ languages with auto-detection. You can exclude specific domains or URLs from the scan and tailor results by country.`,
  instructions: [
    'Provide exactly one of: text, fileUrl, or websiteUrl. If multiple are provided, websiteUrl takes priority over fileUrl, which takes priority over text.'
  ],
  constraints: [
    'Text must be between 100 and 120,000 characters.',
    'Costs 2 credits per word processed.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe('Plain text content to scan (100-120,000 characters)'),
      fileUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL to a .pdf, .doc, or .docx file'),
      websiteUrl: z.string().optional().describe('Public website URL to scan'),
      excludedSources: z
        .array(z.string())
        .optional()
        .describe('Domain names or URLs to exclude from the plagiarism scan (case-sensitive)'),
      language: z
        .string()
        .optional()
        .describe('Two-letter language code (e.g. "en", "fr"), or "auto" for auto-detection'),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code to tailor search results (defaults to "us")')
    })
  )
  .output(
    z.object({
      plagiarismScore: z.number().describe('Overall plagiarism percentage (0-100)'),
      sourceCount: z.number().describe('Number of sources with matching content'),
      totalWordCount: z.number().describe('Total words scanned'),
      totalPlagiarismWords: z.number().describe('Total plagiarized word count'),
      identicalWordCount: z.number().describe('Exact match word count'),
      similarWordCount: z.number().describe('Paraphrased/similar match word count'),
      sources: z
        .array(
          z.object({
            plagiarismScore: z.number().describe('Plagiarism score for this source'),
            canAccess: z.boolean().describe('Whether the source is publicly accessible'),
            url: z.string().describe('URL of the matching source'),
            title: z.string().describe('Title of the matching source'),
            plagiarismWords: z
              .number()
              .describe('Number of plagiarized words from this source'),
            identicalWordCount: z
              .number()
              .describe('Number of identical words from this source'),
            similarWordCount: z.number().describe('Number of similar words from this source'),
            author: z.string().describe('Author of the source, if available'),
            publishedDate: z
              .number()
              .nullable()
              .describe('Unix timestamp of the source publication date'),
            isCitation: z.boolean().describe('Whether this match appears to be a citation'),
            matchedSequences: z
              .array(
                z.object({
                  startIndex: z.number().describe('Start index of the plagiarized sequence'),
                  endIndex: z.number().describe('End index of the plagiarized sequence'),
                  sequence: z.string().describe('The plagiarized text sequence')
                })
              )
              .describe('Specific text sequences matching this source')
          })
        )
        .describe('List of sources with matching content'),
      citations: z.array(z.string()).describe('Citations detected in the text'),
      attackDetected: z
        .object({
          zeroWidthSpace: z
            .boolean()
            .describe('Whether zero-width space obfuscation was detected'),
          homoglyphAttack: z
            .boolean()
            .describe('Whether homoglyph attack obfuscation was detected')
        })
        .describe('Obfuscation attack detection results'),
      scanLanguage: z.string().describe('Language detected or specified for the scan'),
      inputType: z.string().describe('Input type used: text, file, or website'),
      creditsUsed: z.number().describe('Number of credits consumed'),
      creditsRemaining: z.number().describe('Remaining account credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.detectPlagiarism({
      text: ctx.input.text,
      file: ctx.input.fileUrl,
      website: ctx.input.websiteUrl,
      excludedSources: ctx.input.excludedSources,
      language: ctx.input.language,
      country: ctx.input.country
    });

    let sources = (result.sources ?? []).map(s => ({
      plagiarismScore: s.score,
      canAccess: s.canAccess,
      url: s.url,
      title: s.title,
      plagiarismWords: s.plagiarismWords,
      identicalWordCount: s.identicalWordCounts,
      similarWordCount: s.similarWordCounts,
      author: s.author ?? '',
      publishedDate: s.publishedDate ?? null,
      isCitation: s.citation,
      matchedSequences: (s.plagiarismFound ?? []).map(p => ({
        startIndex: p.startIndex,
        endIndex: p.endIndex,
        sequence: p.sequence
      }))
    }));

    return {
      output: {
        plagiarismScore: result.result.score,
        sourceCount: result.result.sourceCounts,
        totalWordCount: result.result.textWordCounts,
        totalPlagiarismWords: result.result.totalPlagiarismWords,
        identicalWordCount: result.result.identicalWordCounts,
        similarWordCount: result.result.similarWordCounts,
        sources,
        citations: result.citations ?? [],
        attackDetected: {
          zeroWidthSpace: result.attackDetected?.zero_width_space ?? false,
          homoglyphAttack: result.attackDetected?.homoglyph_attack ?? false
        },
        scanLanguage: result.scanInformation?.language ?? '',
        inputType: result.scanInformation?.inputType ?? '',
        creditsUsed: result.credits_used,
        creditsRemaining: result.credits_remaining
      },
      message: `Plagiarism scan complete. **Plagiarism score: ${result.result.score}%**. Found ${result.result.sourceCounts} matching source(s). ${result.result.totalPlagiarismWords} plagiarized words out of ${result.result.textWordCounts} total (${result.result.identicalWordCounts} identical, ${result.result.similarWordCounts} similar). Credits used: ${result.credits_used}.`
    };
  });
