import { Slate } from 'slates';
import { spec } from './spec';
import { deleteLink, generateQrCode, listDomains, shortenUrl } from './tools';

export let provider = Slate.create({
  spec,
  tools: [shortenUrl, deleteLink, listDomains, generateQrCode],
  triggers: []
});
