# Reviewed DHA capacity extract

`submitted.json` preserves all 40 supplied records from `Dubai_CSCP.txt` in the user's ZIP. It is an original extraction, not the authoritative table. `reviewed.json` records the original and reviewed values, provenance, each cell correction and an explicit inclusion decision.

The original DHA Clinical Services Capacity Plan 2022–2033 was checked by SHA-256. Table 12 is captioned on PDF/printed page 40 and its reviewed rows appear on page 41. The supply/demand/gap column order was visually checked on page 41; the reproducible checker also compares all 120 source cells (12 columns × 10 specialties) to the native PDF text.

Run from the project root after caching the verified official capacity PDF:

```powershell
node analysis/capacity-2022-2033/review.mjs
```

The source PDF stays in ignored `.knowledge/raw/dha-capacity.pdf`. Its public URL and checksum are in the review and knowledge manifest. The command fails on a changed PDF, unknown specialty/year, duplicate submitted key or source cell mismatch.

Four submitted demand cells were assigned to the wrong years:

| Specialty | Year | Submitted demand | Verified demand |
| --- | --- | ---: | ---: |
| Cardiothoracic Surgery | 2025 | 278 | 213 |
| Cardiothoracic Surgery | 2030 | 213 | 278 |
| Psychiatry | 2025 | 343 | 323 |
| Psychiatry | 2030 | 323 | 343 |

After those corrections, **12 rows still have source arithmetic discrepancies** and are excluded from numerical conclusions. This includes four fractional differences potentially attributable to rounding; no rounding convention has been established, so those are excluded too. Cardiothoracic Surgery 2025/2030 remain excluded despite correcting their demand cells. No source gap has been overwritten with a calculated gap. The 28 included rows are an incomplete subset, not a basis for a total Dubai shortfall.

The 2022 supply baseline is public planning data; demand is modelled, as stated in the report's disclaimer. Years 2025/2030/2033 are projections. For 2030/2033, Table 12 holds the published 2025 supply constant; it does not observe future supply. Units are **acute overnight beds**, not clinic waiting weeks, unbooked specialist hours or outpatient rooms. Positive published gaps mean surplus and negative gaps mean shortage within this table's convention. No rows are assigned to the fictional Alpha–Foxtrot clinics.

The separate 63-row Investment Guide extract remains unverified and excluded: the collected filename and stated edition disagree, original source URLs are absent, and the original table was not supplied. Other collected CSV statistics and the Abu Dhabi workforce policy summary are catalogued separately in `analysis/datasets.json`; they are not silently promoted to verified DHA policy or operational data.

No forecasting training, fine-tuning or claims of predictive accuracy are supported by this review.
