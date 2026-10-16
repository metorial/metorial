import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { domainIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateLinkPreview = SlateTool.create(spec, {
  name: 'Update Link Preview',
  key: 'update_link_preview',
  description:
    'Set Open Graph and social preview properties such as title, description, and image for a short link. Call get_link_preview to inspect existing properties and list_domains/list_links to discover identifiers.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      domainId: domainIdSchema,
      linkId: z.string().describe('Link ID from list_links or create_link.'),
      properties: z
        .array(
          z.object({
            name: z
              .enum([
                'title',
                'type',
                'image',
                'url',
                'audio',
                'description',
                'determiner',
                'locale',
                'locale:alternate',
                'site_name',
                'video',
                'image:url',
                'image:secure_url',
                'image:type',
                'image:width',
                'image:height',
                'image:alt',
                'music:duration',
                'music:album',
                'music:album:disc',
                'music:album:track',
                'music:musician',
                'music:song',
                'music:song:disc',
                'music:song:track',
                'music:release_date',
                'music:creator',
                'video:actor',
                'video:actor:role',
                'video:director',
                'video:writer',
                'video:duration',
                'video:release_date',
                'video:tag',
                'video:series',
                'book:author',
                'book:isbn',
                'book:release_date',
                'book:tag',
                'profile:first_name',
                'profile:last_name',
                'profile:username',
                'profile:gender',
                'twitter:card',
                'twitter:site',
                'twitter:site:id',
                'twitter:creator',
                'twitter:creator:id',
                'twitter:description',
                'twitter:title',
                'twitter:image',
                'twitter:image:alt',
                'twitter:player',
                'twitter:player:width',
                'twitter:player:height',
                'twitter:player:stream',
                'twitter:app:name:iphone',
                'twitter:app:id:iphone',
                'twitter:app:url:iphone',
                'twitter:app:name:ipad',
                'twitter:app:id:ipad',
                'twitter:app:url:ipad',
                'twitter:app:name:googleplay',
                'twitter:app:id:googleplay',
                'twitter:app:url:googleplay',
                'twitter:app:country'
              ])
              .describe('Documented Open Graph or Twitter property name.'),
            value: z.string().describe('Property value, such as preview text or an image URL.')
          })
        )
        .min(1)
        .describe(
          'Complete desired list of preview properties, sent as name/value pairs. Include existing properties you want to keep.'
        )
    })
  )
  .output(
    z.object({ result: z.unknown().describe('Complete update result returned by Short.io.') })
  )
  .handleInvocation(async ctx => {
    let properties: [string, string][] = ctx.input.properties.map(property => [
      property.name,
      property.value
    ]);
    let result = await new Client(ctx.auth).setOpenGraph(
      ctx.input.domainId,
      ctx.input.linkId,
      properties
    );
    return {
      output: { result },
      message: `Updated preview properties for **${ctx.input.linkId}**.`
    };
  })
  .build();
