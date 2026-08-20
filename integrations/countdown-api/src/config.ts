import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    ebayDomain: {
      schema: z
        .enum([
          'ebay.com',
          'ebay.co.uk',
          'ebay.com.au',
          'ebay.at',
          'ebay.be',
          'befr.ebay.be',
          'benl.ebay.be',
          'ebay.ca',
          'ebay.fr',
          'ebay.de',
          'ebay.com.hk',
          'ebay.ie',
          'ebay.it',
          'ebay.com.my',
          'ebay.nl',
          'ebay.ph',
          'ebay.pl',
          'ebay.com.sg',
          'ebay.es',
          'ebay.ch'
        ])
        .default('ebay.com')
        .describe(
          'The default eBay domain to use for requests. Can be overridden per request.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
