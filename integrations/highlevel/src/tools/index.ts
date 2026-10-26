import { blogsTools } from './blogs';
import { calendarsTools } from './calendars';
import { contactsTools } from './contacts';
import { conversationsTools } from './conversations';
import { emailsTools } from './emails';
import { locationsTools } from './locations';
import { opportunitiesTools } from './opportunities';
import { paymentsTools } from './payments';
import { socialTools } from './social';

export {
  blogsTools,
  calendarsTools,
  contactsTools,
  conversationsTools,
  emailsTools,
  locationsTools,
  opportunitiesTools,
  paymentsTools,
  socialTools
};

export const tools = [
  ...calendarsTools,
  ...contactsTools,
  ...conversationsTools,
  ...locationsTools,
  ...opportunitiesTools,
  ...paymentsTools,
  ...blogsTools,
  ...emailsTools,
  ...socialTools
];
