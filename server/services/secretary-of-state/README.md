# State Business Name Search API Availability

## States with Official APIs

1. Delaware (DE)
- Official API: Yes
- Endpoint: https://icis.corp.delaware.gov/eCorp/api/v2/
- Authentication: Required (API key)
- Documentation: Available through DE SOS office
- Status: Most reliable API integration

2. Oregon (OR)
- Official API: Yes
- Endpoint: https://sos.oregon.gov/business/api/
- Authentication: Required (API key)
- Documentation: Public
- Status: Modern REST API

3. New Jersey (NJ)
- Official API: Yes
- Endpoint: https://www.njportal.com/DOR/businessnamesearch/api/
- Authentication: Required (API key)
- Status: Limited access, requires business account

## States with Web Services but No Public API

1. California (CA)
- No official API
- Web interface: https://bizfileonline.sos.ca.gov/
- Status: Web scraping possible but not recommended

2. Nevada (NV)
- No official API
- Web interface: https://esos.nv.gov/EntitySearch/
- Status: Web scraping possible but not recommended

3. Texas (TX)
- No official API
- Web interface: Taxable Entity Search
- Status: Form-based search only

## Implementation Strategy

1. For states with APIs (DE, OR, NJ):
- Implement direct API integration
- Handle rate limiting and authentication
- Cache results where appropriate

2. For all other states:
- Provide direct links to official search portals
- Require manual verification checkbox
- Store verification status

## Notes
- Many states are modernizing their systems but still don't offer public APIs
- Web scraping is generally discouraged and may violate terms of service
- Manual verification is still the most reliable method for most states
