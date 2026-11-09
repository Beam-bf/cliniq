# Dubai healthcare resources: first real-data analysis

Backend development is on hold at the user's request. This analysis is separate from the website's fictional clinic simulation.

Question: what is the scale and composition of Dubai's licensed healthcare workforce and facilities in the official 2024 snapshot?

Source: [Dubai Health Statistical Yearbook 2024](https://www.dha.gov.ae/uploads/122025/Dubai%20Health%20Statistical%20Yearbook_202420251248281.pdf), Dubai Health Authority, reference year 2024; accessed 2026-11-10. Category totals were manually transcribed from Tables 10–12. Counts are source observations; percentages below are calculations. English labels are lightly normalized, and the combined physician grouping retains the source abbreviation rather than assigning an unverified interpretation. This is a starting dataset, not a claim that it is the latest available publication.

## Findings

- The workforce table reports 66,070 licensed personnel. Nurses are the largest of its five job categories: 25,066, or 37.94%.
- Among 14,861 licensed physicians, 6,642 are specialists (44.69%) and 3,396 consultants (22.85%). These are job categories, not a breakdown by medical specialty.
- The facilities table reports 5,372 licensed facilities, including 1,665 polyclinics, 87 specialty clinics/centers and 57 hospitals. The full denominator also includes pharmacies and other types.
- All three sets of category counts reconcile to their published totals. The physician total also matches between Tables 11 and 12. This checks internal consistency of the transcription, not independent accuracy of the publication.

## Reproducible tables

### Licensed health facilities

Source: Table 10, PDF page 40. Denominator: 5,372 licensed facilities.

| Category | Published count | Calculated share |
| --- | ---: | ---: |
| Polyclinics | 1,665 | 30.99% |
| Pharmacies | 1,588 | 29.56% |
| Optical centers | 473 | 8.80% |
| School clinics | 422 | 7.86% |
| Clinical support facilities | 249 | 4.64% |
| Home healthcare agencies | 196 | 3.65% |
| General clinics | 138 | 2.57% |
| Traditional, complementary and alternative medicine facilities | 92 | 1.71% |
| Specialty clinics/centers | 87 | 1.62% |
| Dental general clinics | 75 | 1.40% |
| Dental laboratories | 70 | 1.30% |
| Day surgery centers | 60 | 1.12% |
| Hospitals | 57 | 1.06% |
| Others | 200 | 3.72% |

### Licensed health workforce by job category

Source: Table 11, PDF page 42. Denominator: 66,070 licensed workforce count.

| Category | Published count | Calculated share |
| --- | ---: | ---: |
| Physicians | 14,861 | 22.49% |
| Dentists | 4,580 | 6.93% |
| Pharmacists | 6,633 | 10.04% |
| Nurses | 25,066 | 37.94% |
| Allied healthcare professionals | 14,930 | 22.60% |

### Licensed physicians by job category

Source: Table 12, PDF page 46. Denominator: 14,861 licensed physician count.

| Category | Published count | Calculated share |
| --- | ---: | ---: |
| Consultants | 3,396 | 22.85% |
| Specialists | 6,642 | 44.69% |
| Resd. - G.P. - Priv. (source grouping) | 4,823 | 32.45% |

## What this means for HalaCapacity

These figures provide real regional context and workforce composition. They do not identify which individual clinics have excess hours or waiting-list pressure. Licensed counts cannot be converted into available specialist hours without additional evidence.

- A single 2024 aggregate snapshot, not live data or a time series.
- Licensed workforce counts do not measure FTEs, worked hours, vacancies or spare capacity.
- Physician categories are a subset of workforce, not additional personnel to add to it.
- Facility counts include pharmacies and other facility types; they are not all hospitals or specialist clinics.
- These tables do not provide the clinic/specialty waiting histories, referrals and available hours required by the existing simulation.
- No shortage, transfer recommendation, seasonal effect, waiting-time forecast or clinical benefit is established by this analysis.

The eight-week limit, six-week clinic histories and winter/leave assumptions in the existing app remain fictional simulation inputs. No real figures from this analysis have been assigned to Alpha–Foxtrot or substituted into their forecasts. User validation remains pending.

## Next analysis

For observed demand and capacity, obtain an aggregate series with reporting period, facility identifier, medical specialty, a defined waiting-time measure, referral counts, and scheduled/available specialist hours with matching units and coverage. Record missing data explicitly. Establish whether availability means unbooked hours, contracted hours or another measure before comparing facilities. A trend or forecasting exercise needs repeated observations and held-out evaluation; a single annual snapshot cannot support it.

Public waiting-time datasets from another jurisdiction can be studied separately, with their original geography, definitions and periods. They must not be relabelled as Dubai clinic operations.

## Run and inspect

Run `node analysis/dubai-2024/analyze.mjs` from the project root. It validates counts and regenerates this report, `results.csv` and `results.json` using only built-in Node modules. No packages, account access, database changes or deployment are required.
