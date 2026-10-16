import { toolCategory } from 'slates';
import { listLinkCtas } from './tools/list-link-ctas';
import { shortenLink } from './tools/shorten-link';

export let riteLy = toolCategory({
  key: 'rite-ly',
  name: 'Rite.ly',
  description:
    'Discover Rite.ly Link Ads and create shortened links with promotional overlays.',
  tools: [listLinkCtas, shortenLink]
});
