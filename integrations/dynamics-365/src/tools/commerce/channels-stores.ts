import { commerceChannelInputSchema } from '@slates/dynamics-commerce-recipes';
import { SlateTool } from 'slates';
import { spec } from '../../spec';
import {
  buildCommerceToolOutput,
  commerceMessage,
  commerceResultOutputSchema,
  createCommerceClient
} from './shared';

export let lookupChannelsStores = SlateTool.create(spec, {
  name: 'Lookup Commerce Channels And Stores',
  key: 'lookup_channels_stores',
  description:
    'List Dynamics 365 Commerce channels, get the current channel configuration, retrieve a store by store number, or search stores by text and location through Retail Server.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(commerceChannelInputSchema)
  .output(commerceResultOutputSchema)
  .handleInvocation(async ctx => {
    let client = createCommerceClient(ctx);
    let result: unknown;
    let collection = false;

    switch (ctx.input.action) {
      case 'list_channels':
        result = await client.listChannels(ctx.input);
        collection = true;
        break;
      case 'get_channel_configuration':
        result = await client.getChannelConfiguration();
        break;
      case 'get_store':
        result = await client.getStore({ storeNumber: ctx.input.storeNumber! });
        break;
      case 'search_stores':
        result = await client.searchStores(ctx.input);
        collection = true;
        break;
    }

    let output = buildCommerceToolOutput(ctx.input.action, result, {
      collection,
      pageInput: collection ? ctx.input : undefined
    });

    return {
      output,
      message: commerceMessage('Commerce channels and stores', ctx.input.action, output)
    };
  })
  .build();
