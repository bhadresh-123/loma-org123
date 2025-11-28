# CAQH Autofill Data Dictionary (CV → ProviderProfile → CAQH)

This document defines the canonical `ProviderProfile` schema and acts as a mapping target for parsed CV data.

ProviderProfile fields:

- identifiers.npi → CV: NPI (if available)
- personal.firstName / lastName / dob → CV: personal section
- contact.email / phone → CV: contact section
- addresses.practice → CV: practice address
- licensure[] → CV: license list
- education[] → CV: education entries
- employment[] → CV: work experience entries
- malpractice → CV: malpractice policy (if provided)
- disclosures → CV: yes/no statements (if provided)

Note: Keep `ProviderProfile` as the only source of truth for the filler.

