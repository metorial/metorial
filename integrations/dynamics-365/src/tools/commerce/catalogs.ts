import { commerceCatalogInputSchema } from '@slates/dynamics-commerce-recipes';
import { SlateTool } from 'slates';
import { spec } from '../../spec';
import { findCatalogById } from './retail-server-requests';
import {
  buildCommerceToolOutput,
  commerceMessage,
  commerceResultOutputSchema,
  createCommerceClient,
  withCommerceDefaults,
  withCommercePaginationDefaults
} from './shared';

export let lookupCatalogs = SlateTool.create(spec, {
  name: 'Lookup Commerce Catalogs',
  key: 'lookup_catalogs',
  description:
    'List Dynamics 365 Commerce catalogs for a channel or retrieve one catalog by id through Retail Server catalog APIs.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(commerceCatalogInputSchema)
  .output(commerceResultOutputSchema)
  .handleInvocation(async ctx => {
    let client = createCommerceClient(ctx);
    let input = withCommerceDefaults(ctx, ctx.input);
    let result: unknown;
    let collection = false;

    switch (input.action) {
      case 'list_catalogs':
        result = await client.listCatalogs(input);
        collection = true;
        break;
      case 'get_catalog':
        result = findCatalogById(
          await client.listCatalogs(withCommercePaginationDefaults(ctx, input)),
          input.catalogId!
        );
        break;
    }

    let output = buildCommerceToolOutput(input.action, result, {
      collection,
      pageInput: collection ? input : undefined
    });

    return {
      output,
      message: commerceMessage('Commerce catalogs', input.action, output)
    };
  })
  .build();
