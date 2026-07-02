import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let utilityText = SlateTool.create(spec, {
  name: 'Text Utilities',
  key: 'utility_text',
  description: `Perform text processing operations including regex search, text splitting, email/URL extraction from text, text comparison, case formatting, HTML escaping/unescaping, and text validation. Useful for processing and transforming text data in workflows.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'regex_search',
          'split_text',
          'extract_emails',
          'extract_urls',
          'compare_text',
          'format_case',
          'escape_html',
          'unescape_html',
          'validate_email',
          'validate_json',
          'contains_value',
          'replace_text',
          'replace_regex'
        ])
        .describe('Text operation to perform'),
      text: z.string().optional().describe('Input text to process'),
      pattern: z.string().optional().describe('Regex pattern (for regex operations)'),
      delimiter: z.string().optional().describe('Delimiter for text splitting'),
      compareText: z.string().optional().describe('Second text for comparison'),
      caseFormat: z
        .string()
        .optional()
        .describe('Case format (e.g., Upper, Lower, Title, Sentence)'),
      searchValue: z
        .string()
        .optional()
        .describe('Value to search for (for contains/replace)'),
      replaceValue: z.string().optional().describe('Replacement value'),
      email: z.string().optional().describe('Email address to validate'),
      json: z.string().optional().describe('JSON string to validate')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Operation result (varies by operation type)'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;

    switch (ctx.input.operation) {
      case 'regex_search':
        result = await client.utilityPost('RegexSearchTextV2', {
          text: ctx.input.text,
          pattern: ctx.input.pattern
        });
        break;

      case 'split_text':
        result = await client.utilityPost('SplitText', {
          text: ctx.input.text,
          delimiter: ctx.input.delimiter
        });
        break;

      case 'extract_emails':
        result = await client.utilityPost('ExtractEmailAddressesFromText', {
          text: ctx.input.text
        });
        break;

      case 'extract_urls':
        result = await client.utilityPost('ExtractUrlsFromText', {
          text: ctx.input.text
        });
        break;

      case 'compare_text':
        result = await client.utilityPost('CompareText', {
          text: ctx.input.text,
          compareText: ctx.input.compareText
        });
        break;

      case 'format_case':
        result = await client.utilityPost('FormatTextCase', {
          text: ctx.input.text,
          textCase: ctx.input.caseFormat || 'Upper'
        });
        break;

      case 'escape_html':
        result = await client.utilityPost('EscapeHtml', {
          text: ctx.input.text
        });
        break;

      case 'unescape_html':
        result = await client.utilityPost('UnescapeHtml', {
          text: ctx.input.text
        });
        break;

      case 'validate_email':
        result = await client.utilityPost('ValidateEmailAddress', {
          emailAddress: ctx.input.email || ctx.input.text
        });
        break;

      case 'validate_json':
        result = await client.utilityPost('ValidateJson', {
          json: ctx.input.json || ctx.input.text
        });
        break;

      case 'contains_value':
        result = await client.utilityPost('TextContainsValue', {
          text: ctx.input.text,
          searchValue: ctx.input.searchValue
        });
        break;

      case 'replace_text':
        result = await client.utilityPost('ReplaceValueWithText', {
          text: ctx.input.text,
          searchValue: ctx.input.searchValue,
          replaceValue: ctx.input.replaceValue || ''
        });
        break;

      case 'replace_regex':
        result = await client.utilityPost('ReplaceValueWithRegex', {
          text: ctx.input.text,
          pattern: ctx.input.pattern,
          replaceValue: ctx.input.replaceValue || ''
        });
        break;
    }

    return {
      output: {
        result:
          result.result ||
          result.Result ||
          result.data ||
          result.Data ||
          result.isValid ||
          result,
        operationId: result.OperationId || ''
      },
      message: `Successfully performed **${ctx.input.operation.replace(/_/g, ' ')}** operation.`
    };
  })
  .build();
