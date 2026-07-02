import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let uploadToIpfs = SlateTool.create(spec, {
  name: 'Upload to IPFS',
  key: 'upload_to_ipfs',
  description: `Upload content to IPFS through Starton's pinning service. Supports uploading JSON metadata (commonly used for NFT metadata) or listing/managing existing pins. Content stored on IPFS is immutable and always accessible via its CID.`,
  instructions: [
    'Use JSON upload for NFT metadata or structured data.',
    'The returned CID can be used as an IPFS URI: ipfs://ipfs/{cid}'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the pinned content'),
      content: z.any().describe('JSON content to upload to IPFS'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional metadata key-value pairs for the pin')
    })
  )
  .output(
    z.object({
      pinId: z.string().describe('Starton pin identifier'),
      cid: z.string().describe('IPFS content identifier (CID)'),
      ipfsUri: z.string().describe('Full IPFS URI for the content'),
      name: z.string().describe('Name of the pinned content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    let result = await client.uploadJsonToIpfs({
      name: ctx.input.name,
      content: ctx.input.content,
      metadata: ctx.input.metadata
    });

    let cid = result.cid || result.pinStatus?.pin?.cid || '';

    return {
      output: {
        pinId: result.id || '',
        cid: cid,
        ipfsUri: `ipfs://ipfs/${cid}`,
        name: ctx.input.name
      },
      message: `Uploaded **${ctx.input.name}** to IPFS. CID: \`${cid}\`\nURI: \`ipfs://ipfs/${cid}\``
    };
  })
  .build();
