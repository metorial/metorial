import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'giphy',
  name: 'Giphy',
  description:
    "Search, discover, and retrieve GIFs, stickers, animated emoji, and video clips from GIPHY's library of millions of items.",
  metadata: {},
  config,
  auth
});
