Now let me fetch the full API reference to get more details on all available services.Now I have enough information to write the specification.

# Slates Specification for Data247

## Overview

Data247 is a simple, and secure on-demand data platform that provides businesses with a wide-range of data lookup services. Data247 delivers real-time data such as phone carrier lookups, email-to-SMS gateway solutions and caller name (CNAM) services. It also offers data verification, data appending, IP geolocation, Do-Not-Call compliance checking, and fraud detection services.

## Authentication

Data247 API (version 3.0) supports two authentication methods:

**API Key Authentication (v3.0 — current):**
Instead of a username and password, version 3 of the API uses an API key. You can generate multiple API keys via your Data247 account and then use the different keys the same way you would use sub-accounts. The API key is passed as a query parameter `key` in each request:

```
https://api.data247.com/v3.0?key={my_api_key}&api=MT&phone={phone}
```

Data247 uses API keys for authentication.

**Username/Password Authentication (v2.0 — legacy):**
The older API version uses username and password passed as query parameters:

```
https://api.data24-7.com/textat.php?username=YOUR_USERNAME&password=YOUR_PASSWORD&p1=PHONENUM
```

**Optional IP Authentication:**
This error usually occurs because your account has IP authentication turned on. This means that the API will only accept requests from the IP addresses you have listed — requests from any other address will be rejected. To fix the problem, you can either add the additional IP address(es) you are using, or turn IP authentication off. To do this, log into your account and select IP Authentication from the Account drop-down menu.

## Features

### SMS/MMS Gateway Lookup (Text@)

Text@ retrieves Email-to-SMS and Email-to-MMS gateway addresses of client's wireless phones. Businesses then use these addresses to send SMS and/or MMS messages to their clients via regular email. Using the carriers' gateway addresses allows businesses to send multiple text messages to customers without having to pay each time a message is sent.

- Input: phone number(s)
- Returns: carrier name, wireless status, SMS gateway address, MMS gateway address
- When your client ports their phone number from one carrier to another, Data247 knows about it almost immediately. Records are guaranteed to be updated within one business day, though usually within an hour.

### Carrier Lookup (Carrier247)

Identify the carrier associated with phone numbers.

- **USA**: Returns carrier name, iswireless, email-to-SMS, and email-to-MMS gateway addresses for provided domestic US phone numbers.
- **International**: Returns carrier information for international phone numbers, including whether they are wireless or landline numbers. You must provide country code in your phone number.
- **Carrier Type**: Similar to Carrier247 (USA), but only returns a subset of the data (just the carrier type), and it works for Canadian phone numbers as well as USA without requiring CLNPC subscription.

### Data Verification (Verify247)

Validate contact data to ensure accuracy.

- **Email Verification**: Verify that each email address is properly formatted and there is a working mailbox associated with it. Returns validity status, reason, and whether the address is a free account.
- **Postal Address Verification**: Verifies provided USA postal addresses and parses out to different address components. Returns corrected/standardized addresses if incorrect.
- **Phone Number Verification**: Can tell you whether a phone number is active and the confidence level for that number. Not available in USA/Canada.

### Data Appending (Append247)

Enrich existing records with additional contact and demographic data.

- **Phone Append**: Appends phone numbers for your contacts. You supply names and addresses of your contacts, and the API will return their phone.
- **Email Append**: Appends email addresses for your contacts. You supply names and addresses or their phone numbers, and the API will return their email addresses.
- **Reverse Phone Lookup**: Finds the name and address associated with a phone number. Optional consumer data can also be returned.
- **Reverse Email Lookup**: From an email address, get the name and address of the person who owns it.
- **Name Lookup**: Takes phone as input and returns name of person behind it.
- **Gender Lookup**: Returns the probable gender associated with a name.
- **Zipcode Append**: Appends 9-digit zipcodes for your contacts. You supply the addresses, and the API will return their zip code and other information.
- **Reverse Zipcode**: Takes a 5 or 9 digit zipcode, and returns the formatted address components (address, city, state etc) of that location.
- **Profile Data**: Gives you additional information about the people on your lead list, including Financial, Interests, and/or Household data.
- **Property Data**: Provides a seamless way to confirm property ownership by matching a homeowner's name to their address.

### IP Geolocation (Locate247)

Locate247 (IP) is an IP Geolocation service that allows you to locate the source of web traffic anywhere in the world. It provides an effective way of learning more about the people accessing your web services, allowing you to target your web content and prevent fraudulent transactions by matching a customer's given location with their IP address location.

- Returns: city, state, country, zipcode, latitude, longitude, area code, timezone, and DST info.

### Do-Not-Call Compliance

Data247's Do-Not-Call service helps your organization stay compliant with Federal Do Not Call laws by checking and providing your business with information on whether phone numbers are present on the Federal Do Not Call list or your company's internal list.

- Available for USA. Canada service is under development.
- To use Federal Do-Not-Call service, you need to register with the FTC's National Do-Not-Call Registry and specify the area codes you will be calling. You will be assigned an Organization ID and a Subscription Account Number (SAN), both of which must be provided to Data247.

### Fraud Detection (Trust247)

- **User Identity**: Trust247 (User Identity) uses vast data resources to cross-reference the details of a new user account to determine whether it is likely an instance of account creation fraud.
- **Phone Number**: Trust247 (Phone Number) takes a phone number as input and returns whether it's on a list of SPAM callers.

### Data Feed Subscriptions

Subscribe to Data247 Feeds to get customized up-to-date data (such as new movers, restaurant openings or phone connects) on a continuing basis. Customize your feed by location, delivery type, delivery period and more!

Available feeds include: New Movers, Phone Connects/Disconnects, New Restaurant Openings, and USA Ported Numbers.

### Account Balance Check

The API allows checking your current account balance by calling the balance endpoint with your API key.

## Events

The provider does not support events. Data247 is a stateless data lookup service that returns results in real-time per request. It does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
