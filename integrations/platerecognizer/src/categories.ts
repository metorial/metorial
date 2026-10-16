import { toolCategory } from 'slates';
import {
  blurImage,
  blurImageFile,
  recognizeBoat,
  recognizeContainer,
  recognizePlate,
  recognizeText,
  recognizeTrailer,
  recognizeUsdot,
  recognizeVin
} from './tools';

export let toolCategories = [
  toolCategory({
    key: 'snapshot',
    name: 'Snapshot',
    description: 'License plate and vehicle recognition from images.',
    tools: [recognizePlate]
  }),
  toolCategory({
    key: 'blur',
    name: 'Blur',
    description: 'License plate and face detection and image blurring.',
    tools: [blurImage, blurImageFile]
  }),
  toolCategory({
    key: 'ocr',
    name: 'OCR',
    description:
      'Text identifiers including VINs, trailer IDs, odometers, container information, and boat registration numbers.',
    tools: [recognizeText]
  }),
  toolCategory({
    key: 'vin-id',
    name: 'VIN ID',
    description: 'Compatibility access to the original VIN ID recognition service.',
    tools: [recognizeVin]
  }),
  toolCategory({
    key: 'trailer-id',
    name: 'TrailerID',
    description: 'Trailer identification number recognition.',
    tools: [recognizeTrailer]
  }),
  toolCategory({
    key: 'boat-id',
    name: 'BoatID',
    description: 'Boat registration number recognition.',
    tools: [recognizeBoat]
  }),
  toolCategory({
    key: 'usdot',
    name: 'USDOT OCR',
    description: 'USDOT number recognition for commercial vehicles.',
    tools: [recognizeUsdot]
  }),
  toolCategory({
    key: 'shipping-container',
    name: 'Shipping Container Images',
    description: 'Shipping container identification and markings.',
    tools: [recognizeContainer]
  })
];
