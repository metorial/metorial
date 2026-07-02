import { COMMERCE_METADATA_MIME_TYPE } from '@slates/dynamics-commerce-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import { createCommerceClient, metadataOutputSchema } from './shared';

export let downloadRetailServerMetadata = SlateTool.create(spec, {
  name: 'Download Retail Server Metadata',
  key: 'download_retail_server_metadata',
  description:
    'Download the Dynamics 365 Commerce Retail Server $metadata XML document as a Slate attachment for schema discovery.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(metadataOutputSchema)
  .handleInvocation(async ctx => {
    let client = createCommerceClient(ctx);
    let attachment = await client.downloadMetadataAttachment();

    return {
      output: {
        mimeType: COMMERCE_METADATA_MIME_TYPE,
        attachmentCount: 1
      },
      message: 'Downloaded Dynamics 365 Commerce Retail Server metadata.',
      attachments: [attachment]
    };
  })
  .build();
