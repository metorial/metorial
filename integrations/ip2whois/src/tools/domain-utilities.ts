import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  extractDomain,
  extractExtension,
  fromPunycode,
  toPunycode
} from '../lib/domain-utils';
import { spec } from '../spec';

export let domainUtilities = SlateTool.create(spec, {
  name: 'Domain Utilities',
  key: 'domain_utilities',
  description: `A collection of domain name helper utilities. Supports:
- **Punycode conversion**: Convert internationalized domain names (IDN) to punycode and back.
- **Domain extraction**: Extract the domain name from a full URL.
- **Extension extraction**: Identify the gTLD or ccTLD from a URL or domain name.

Specify the operation you want to perform and provide the appropriate input.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['to_punycode', 'from_punycode', 'extract_domain', 'extract_extension'])
        .describe(
          'The utility operation to perform: "to_punycode" converts IDN to punycode, "from_punycode" converts punycode to IDN, "extract_domain" extracts domain from a URL, "extract_extension" extracts the TLD from a domain or URL'
        ),
      input: z.string().describe('The domain name or URL to process')
    })
  )
  .output(
    z.object({
      operation: z.string().describe('The operation that was performed'),
      input: z.string().describe('The original input value'),
      result: z.string().describe('The result of the operation')
    })
  )
  .handleInvocation(async ctx => {
    let { operation, input } = ctx.input;
    let result: string;

    switch (operation) {
      case 'to_punycode':
        result = toPunycode(input);
        break;
      case 'from_punycode':
        result = fromPunycode(input);
        break;
      case 'extract_domain':
        result = extractDomain(input);
        break;
      case 'extract_extension':
        result = extractExtension(input);
        break;
    }

    return {
      output: {
        operation,
        input,
        result
      },
      message: `**${operation}**: \`${input}\` → \`${result}\``
    };
  })
  .build();
