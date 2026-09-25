# Public beta HTTP coverage — 2026-09-25

Run `npm run data:audit:beta` to repeat this audit against the current code and data. The integration suite runs the same checks in CI. This snapshot uses geographic data version `geo-2026-09-25.13` and portrait catalog `empty-v1`.

| Status | Codes | HTTP outcome |
| --- | ---: | --- |
| Available with reviewed local names | 209 | Complete, schema-valid profile |
| Pending local name review | 33 | 400 `UNSUPPORTED_VALUE` |
| No permanent resident profile | 7 | 400 `UNSUPPORTED_VALUE` |

**Available (209):** AD, AE, AF, AG, AL, AM, AO, AR, AS, AT, AU, AW, AX, AZ, BA, BB, BD, BE, BF, BG, BH, BI, BJ, BM, BO, BR, BS, BT, BW, BY, BZ, CA, CD, CF, CG, CH, CI, CK, CL, CM, CN, CO, CR, CU, CV, CW, CY, CZ, DE, DJ, DK, DM, DO, DZ, EC, EE, EG, EH, ER, ES, ET, FI, FJ, FK, FM, FO, FR, GA, GB, GD, GE, GF, GG, GH, GI, GL, GM, GN, GP, GQ, GR, GT, GU, GW, GY, HK, HN, HR, HT, HU, ID, IE, IL, IM, IN, IQ, IR, IS, IT, JE, JM, JO, JP, KE, KG, KM, KN, KP, KR, KW, KZ, LB, LC, LI, LK, LR, LS, LT, LU, LV, LY, MA, MC, MD, ME, MG, MK, ML, MM, MQ, MR, MT, MU, MV, MW, MX, MZ, NA, NC, NE, NG, NI, NL, NO, NP, NR, NZ, PA, PE, PF, PG, PH, PK, PL, PR, PS, PT, PW, PY, QA, RE, RO, RS, RU, RW, SA, SB, SC, SD, SE, SG, SH, SI, SK, SL, SM, SN, SO, SR, SS, ST, SV, SY, SZ, TD, TG, TH, TL, TN, TR, TT, TW, TZ, UA, UG, US, UY, UZ, VC, VE, VI, VN, VU, WS, YE, YT, ZA, ZM, ZW.

**Pending name review (33):** AI, BL, BN, BQ, CC, CX, KH, KI, KY, LA, MF, MH, MN, MO, MP, MS, MY, NF, NU, OM, PM, PN, SJ, SX, TC, TJ, TK, TM, TO, TV, VA, VG, WF. These codes remain in the registry; no neighboring name pool is substituted. Follow #17 and its regional review issues.

**Unavailable (7):** AQ, BV, GS, HM, IO, TF, UM. These codes are recognized but not sampled as resident profiles.

For each available code, the audit requests two people with explicit country, age, gender, appearance, seed, and `asOf`. It checks the response schema, country-linked city and address, nonempty names, calendar age, fictional contact, compatible approved portrait or `null`, exact seeded replay, and field projection. All checks passed with zero audit errors.

The coverage matrix still marks 242 resident codes with partial city-level addresses. Phone values use reviewed reserved ranges where available and local-format examples elsewhere; unreserved values can be real numbers even when zero-filled. The production portrait catalog contains 0 approved assets and 0/96 ready age/gender/appearance combinations, so current API responses have `picture: null`. This audit validates the current beta boundary; rerun it after data or catalog changes and before deployment.
