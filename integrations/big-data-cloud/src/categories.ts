import { toolCategory } from 'slates';
import {
  assessIpRiskTool,
  geolocateIpTool,
  getCountryInfoTool,
  getTimezoneInfoTool,
  listAsnPeersTool,
  lookupAsnTool,
  lookupNetworksByCidrTool,
  lookupNetworkTool,
  reverseGeocodeTool,
  validatePhoneNumberTool,
  verifyEmailTool
} from './tools';

export let toolCategories = [
  toolCategory({
    key: 'ip-geolocation',
    name: 'IP Geolocation',
    description: 'IP geolocation, hazard reports, country details and time zone conversion.',
    tools: [
      geolocateIpTool,
      assessIpRiskTool,
      getCountryInfoTool,
      getTimezoneInfoTool,
      lookupNetworkTool
    ]
  }),
  toolCategory({
    key: 'reverse-geocoding',
    name: 'Reverse Geocoding',
    description: 'Locality and time zone information from geographic coordinates.',
    tools: [reverseGeocodeTool]
  }),
  toolCategory({
    key: 'phone-email',
    name: 'Phone and Email Verification',
    description: 'Phone number formatting and email address verification.',
    tools: [validatePhoneNumberTool, verifyEmailTool]
  }),
  toolCategory({
    key: 'network-engineering',
    name: 'Network Engineering',
    description: 'ASN routing relationships and BGP network discovery.',
    tools: [lookupAsnTool, lookupNetworkTool, listAsnPeersTool, lookupNetworksByCidrTool]
  })
];
