import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Customer.io tool input schemas', provider.actions);
