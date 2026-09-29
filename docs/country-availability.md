# Country data availability

Data version: `geo-2026-09-26.1`. This table is generated from the checked-in country, city, postal, name-review, and phone catalogues. Run `npm run data:availability` after changing those sources; `npm run data:availability:check` detects a stale table.

209 of 249 assigned country and territory codes can generate profiles; 33 await local name review and 7 have no permanent resident profile. Among available codes, 531 of 2454 sampled cities across 73 countries have a city-linked postcode.

A postcode count applies only to the sampled cities, not every address in a country. A zero means Persona returns `location.postcode: null` for every sampled city of that code. A nonzero count does not guarantee a postcode for every generated person. Synthetic street lines are illustrative and may not be deliverable. `format-valid` phones are not reserved and may belong to real subscribers; never contact them. Phone information for a pending profile describes source readiness, not an API response currently available for that nationality.

| Code | Country or territory | Profile | Cities with postcode / sampled | Phone |
| --- | --- | --- | ---: | --- |
| AD | Andorra | available | 6/12 | format-valid |
| AE | United Arab Emirates | available | 0/12 | format-valid |
| AF | Afghanistan | available | 0/12 | format-valid |
| AG | Antigua and Barbuda | available | 0/12 | reserved-range |
| AI | Anguilla | pending-name-review | 0/12 | reserved-range |
| AL | Albania | available | 0/12 | format-valid |
| AM | Armenia | available | 0/12 | format-valid |
| AO | Angola | available | 0/12 | format-valid |
| AQ | Antarctica | unavailable | 0/0 | not-applicable |
| AR | Argentina | available | 0/12 | format-valid |
| AS | American Samoa | available | 1/12 | reserved-range |
| AT | Austria | available | 5/12 | format-valid |
| AU | Australia | available | 8/12 | reserved-range |
| AW | Aruba | available | 0/12 | format-valid |
| AX | Åland Islands | available | 8/12 | format-valid |
| AZ | Azerbaijan | available | 0/12 | format-valid |
| BA | Bosnia and Herzegovina | available | 0/12 | format-valid |
| BB | Barbados | available | 0/12 | reserved-range |
| BD | Bangladesh | available | 2/12 | format-valid |
| BE | Belgium | available | 10/12 | format-valid |
| BF | Burkina Faso | available | 0/12 | format-valid |
| BG | Bulgaria | available | 0/12 | format-valid |
| BH | Bahrain | available | 0/12 | format-valid |
| BI | Burundi | available | 0/12 | format-valid |
| BJ | Benin | available | 0/12 | format-valid |
| BL | Saint Barthélemy | pending-name-review | 0/1 | format-valid |
| BM | Bermuda | available | 1/11 | reserved-range |
| BN | Brunei Darussalam | pending-name-review | 0/12 | format-valid |
| BO | Bolivia, Plurinational State of | available | 0/12 | format-valid |
| BQ | Bonaire, Sint Eustatius and Saba | pending-name-review | 0/8 | format-valid |
| BR | Brazil | available | 0/12 | format-valid |
| BS | Bahamas | available | 0/12 | reserved-range |
| BT | Bhutan | available | 0/12 | format-valid |
| BV | Bouvet Island | unavailable | 0/0 | not-applicable |
| BW | Botswana | available | 0/12 | format-valid |
| BY | Belarus | available | 1/12 | format-valid |
| BZ | Belize | available | 0/12 | format-valid |
| CA | Canada | available | 0/12 | reserved-range |
| CC | Cocos (Keeling) Islands | pending-name-review | 0/1 | format-valid |
| CD | Congo, Democratic Republic of the | available | 0/12 | format-valid |
| CF | Central African Republic | available | 0/12 | format-valid |
| CG | Congo | available | 0/12 | format-valid |
| CH | Switzerland | available | 8/12 | format-valid |
| CI | Côte d'Ivoire | available | 0/12 | format-valid |
| CK | Cook Islands | available | 0/2 | format-valid |
| CL | Chile | available | 10/12 | format-valid |
| CM | Cameroon | available | 0/12 | format-valid |
| CN | China | available | 10/12 | format-valid |
| CO | Colombia | available | 11/12 | format-valid |
| CR | Costa Rica | available | 8/11 | format-valid |
| CU | Cuba | available | 0/12 | format-valid |
| CV | Cabo Verde | available | 0/12 | format-valid |
| CW | Curaçao | available | 0/12 | format-valid |
| CX | Christmas Island | pending-name-review | 0/1 | format-valid |
| CY | Cyprus | available | 5/12 | format-valid |
| CZ | Czechia | available | 3/12 | format-valid |
| DE | Germany | available | 10/12 | reserved-range |
| DJ | Djibouti | available | 0/12 | format-valid |
| DK | Denmark | available | 7/12 | format-valid |
| DM | Dominica | available | 0/12 | reserved-range |
| DO | Dominican Republic | available | 1/12 | reserved-range |
| DZ | Algeria | available | 1/12 | format-valid |
| EC | Ecuador | available | 7/12 | format-valid |
| EE | Estonia | available | 7/12 | format-valid |
| EG | Egypt | available | 0/12 | format-valid |
| EH | Western Sahara | available | 0/12 | format-valid |
| ER | Eritrea | available | 0/12 | format-valid |
| ES | Spain | available | 10/12 | format-valid |
| ET | Ethiopia | available | 0/12 | format-valid |
| FI | Finland | available | 11/12 | format-valid |
| FJ | Fiji | available | 0/12 | format-valid |
| FK | Falkland Islands (Malvinas) | available | 1/1 | format-valid |
| FM | Micronesia, Federated States of | available | 0/12 | format-valid |
| FO | Faroe Islands | available | 9/12 | format-valid |
| FR | France | available | 10/12 | reserved-range |
| GA | Gabon | available | 0/12 | format-valid |
| GB | United Kingdom of Great Britain and Northern Ireland | available | 0/12 | reserved-range |
| GD | Grenada | available | 0/9 | reserved-range |
| GE | Georgia | available | 0/12 | format-valid |
| GF | French Guiana | available | 12/12 | format-valid |
| GG | Guernsey | available | 0/11 | format-valid |
| GH | Ghana | available | 0/12 | format-valid |
| GI | Gibraltar | available | 1/6 | format-valid |
| GL | Greenland | available | 12/12 | format-valid |
| GM | Gambia | available | 0/12 | format-valid |
| GN | Guinea | available | 0/12 | format-valid |
| GP | Guadeloupe | available | 12/12 | format-valid |
| GQ | Equatorial Guinea | available | 0/13 | format-valid |
| GR | Greece | available | 0/12 | format-valid |
| GS | South Georgia and the South Sandwich Islands | unavailable | 0/0 | not-applicable |
| GT | Guatemala | available | 11/12 | format-valid |
| GU | Guam | available | 2/13 | reserved-range |
| GW | Guinea-Bissau | available | 0/12 | format-valid |
| GY | Guyana | available | 0/12 | format-valid |
| HK | Hong Kong | available | 0/12 | format-valid |
| HM | Heard Island and McDonald Islands | unavailable | 0/0 | not-applicable |
| HN | Honduras | available | 8/11 | format-valid |
| HR | Croatia | available | 9/12 | format-valid |
| HT | Haiti | available | 0/12 | format-valid |
| HU | Hungary | available | 7/12 | format-valid |
| ID | Indonesia | available | 1/12 | format-valid |
| IE | Ireland | available | 0/12 | reserved-range |
| IL | Israel | available | 0/12 | format-valid |
| IM | Isle of Man | available | 0/12 | format-valid |
| IN | India | available | 0/13 | format-valid |
| IO | British Indian Ocean Territory | unavailable | 0/0 | not-applicable |
| IQ | Iraq | available | 0/12 | format-valid |
| IR | Iran, Islamic Republic of | available | 0/12 | format-valid |
| IS | Iceland | available | 5/12 | format-valid |
| IT | Italy | available | 6/12 | format-valid |
| JE | Jersey | available | 0/6 | format-valid |
| JM | Jamaica | available | 0/12 | reserved-range |
| JO | Jordan | available | 0/12 | format-valid |
| JP | Japan | available | 1/12 | format-valid |
| KE | Kenya | available | 10/11 | format-valid |
| KG | Kyrgyzstan | available | 0/12 | format-valid |
| KH | Cambodia | pending-name-review | 0/12 | format-valid |
| KI | Kiribati | pending-name-review | 0/12 | format-valid |
| KM | Comoros | available | 0/12 | format-valid |
| KN | Saint Kitts and Nevis | available | 0/12 | reserved-range |
| KP | Korea, Democratic People's Republic of | available | 0/12 | format-valid |
| KR | Korea, Republic of | available | 0/12 | format-valid |
| KW | Kuwait | available | 0/12 | format-valid |
| KY | Cayman Islands | pending-name-review | 0/12 | reserved-range |
| KZ | Kazakhstan | available | 0/12 | format-valid |
| LA | Lao People's Democratic Republic | pending-name-review | 0/12 | format-valid |
| LB | Lebanon | available | 0/12 | format-valid |
| LC | Saint Lucia | available | 0/12 | reserved-range |
| LI | Liechtenstein | available | 8/12 | format-valid |
| LK | Sri Lanka | available | 8/12 | format-valid |
| LR | Liberia | available | 0/12 | format-valid |
| LS | Lesotho | available | 0/12 | format-valid |
| LT | Lithuania | available | 6/12 | format-valid |
| LU | Luxembourg | available | 0/12 | format-valid |
| LV | Latvia | available | 11/12 | format-valid |
| LY | Libya | available | 0/12 | format-valid |
| MA | Morocco | available | 1/12 | format-valid |
| MC | Monaco | available | 7/12 | format-valid |
| MD | Moldova, Republic of | available | 0/12 | format-valid |
| ME | Montenegro | available | 0/12 | format-valid |
| MF | Saint Martin (French part) | pending-name-review | 0/9 | format-valid |
| MG | Madagascar | available | 0/12 | format-valid |
| MH | Marshall Islands | pending-name-review | 0/12 | format-valid |
| MK | North Macedonia | available | 8/12 | format-valid |
| ML | Mali | available | 0/12 | format-valid |
| MM | Myanmar | available | 0/12 | format-valid |
| MN | Mongolia | pending-name-review | 0/12 | format-valid |
| MO | Macao | pending-name-review | 0/7 | format-valid |
| MP | Northern Mariana Islands | pending-name-review | 1/6 | reserved-range |
| MQ | Martinique | available | 12/12 | format-valid |
| MR | Mauritania | available | 0/12 | format-valid |
| MS | Montserrat | pending-name-review | 0/3 | reserved-range |
| MT | Malta | available | 0/13 | format-valid |
| MU | Mauritius | available | 0/12 | format-valid |
| MV | Maldives | available | 0/12 | format-valid |
| MW | Malawi | available | 0/12 | format-valid |
| MX | Mexico | available | 2/12 | format-valid |
| MY | Malaysia | pending-name-review | 7/12 | format-valid |
| MZ | Mozambique | available | 0/12 | format-valid |
| NA | Namibia | available | 0/12 | format-valid |
| NC | New Caledonia | available | 9/12 | format-valid |
| NE | Niger | available | 0/12 | format-valid |
| NF | Norfolk Island | pending-name-review | 0/1 | format-valid |
| NG | Nigeria | available | 0/12 | format-valid |
| NI | Nicaragua | available | 0/12 | format-valid |
| NL | Netherlands, Kingdom of the | available | 0/12 | format-valid |
| NO | Norway | available | 11/12 | reserved-range |
| NP | Nepal | available | 0/12 | format-valid |
| NR | Nauru | available | 0/10 | format-valid |
| NU | Niue | pending-name-review | 0/1 | format-valid |
| NZ | New Zealand | available | 10/12 | format-valid |
| OM | Oman | pending-name-review | 0/12 | format-valid |
| PA | Panama | available | 0/12 | format-valid |
| PE | Peru | available | 12/12 | format-valid |
| PF | French Polynesia | available | 9/12 | format-valid |
| PG | Papua New Guinea | available | 0/12 | format-valid |
| PH | Philippines | available | 2/12 | format-valid |
| PK | Pakistan | available | 0/13 | format-valid |
| PL | Poland | available | 11/12 | format-valid |
| PM | Saint Pierre and Miquelon | pending-name-review | 2/2 | format-valid |
| PN | Pitcairn | pending-name-review | 1/1 | unavailable |
| PR | Puerto Rico | available | 11/12 | reserved-range |
| PS | Palestine, State of | available | 0/12 | format-valid |
| PT | Portugal | available | 10/12 | format-valid |
| PW | Palau | available | 0/13 | format-valid |
| PY | Paraguay | available | 0/12 | format-valid |
| QA | Qatar | available | 0/12 | format-valid |
| RE | Réunion | available | 12/12 | format-valid |
| RO | Romania | available | 6/12 | format-valid |
| RS | Serbia | available | 10/12 | format-valid |
| RU | Russian Federation | available | 0/12 | format-valid |
| RW | Rwanda | available | 0/12 | format-valid |
| SA | Saudi Arabia | available | 0/12 | format-valid |
| SB | Solomon Islands | available | 0/11 | format-valid |
| SC | Seychelles | available | 0/12 | format-valid |
| SD | Sudan | available | 0/12 | format-valid |
| SE | Sweden | available | 10/12 | reserved-range |
| SG | Singapore | available | 0/12 | format-valid |
| SH | Saint Helena, Ascension and Tristan da Cunha | available | 0/4 | format-valid |
| SI | Slovenia | available | 12/12 | format-valid |
| SJ | Svalbard and Jan Mayen | pending-name-review | 1/2 | format-valid |
| SK | Slovakia | available | 10/12 | format-valid |
| SL | Sierra Leone | available | 0/12 | format-valid |
| SM | San Marino | available | 11/12 | format-valid |
| SN | Senegal | available | 0/12 | format-valid |
| SO | Somalia | available | 0/12 | format-valid |
| SR | Suriname | available | 0/12 | format-valid |
| SS | South Sudan | available | 0/12 | format-valid |
| ST | Sao Tome and Principe | available | 0/12 | format-valid |
| SV | El Salvador | available | 0/12 | format-valid |
| SX | Sint Maarten (Dutch part) | pending-name-review | 0/6 | reserved-range |
| SY | Syrian Arab Republic | available | 0/12 | format-valid |
| SZ | Eswatini | available | 0/12 | format-valid |
| TC | Turks and Caicos Islands | pending-name-review | 0/7 | reserved-range |
| TD | Chad | available | 0/12 | format-valid |
| TF | French Southern Territories | unavailable | 0/0 | not-applicable |
| TG | Togo | available | 0/12 | format-valid |
| TH | Thailand | available | 6/12 | format-valid |
| TJ | Tajikistan | pending-name-review | 0/12 | format-valid |
| TK | Tokelau | pending-name-review | 0/3 | format-valid |
| TL | Timor-Leste | available | 0/12 | format-valid |
| TM | Turkmenistan | pending-name-review | 0/12 | format-valid |
| TN | Tunisia | available | 0/12 | format-valid |
| TO | Tonga | pending-name-review | 0/12 | format-valid |
| TR | Türkiye | available | 1/12 | format-valid |
| TT | Trinidad and Tobago | available | 0/12 | reserved-range |
| TV | Tuvalu | pending-name-review | 0/9 | format-valid |
| TW | Taiwan, Province of China | available | 0/12 | format-valid |
| TZ | Tanzania, United Republic of | available | 0/12 | format-valid |
| UA | Ukraine | available | 0/12 | format-valid |
| UG | Uganda | available | 0/12 | format-valid |
| UM | United States Minor Outlying Islands | unavailable | 0/0 | not-applicable |
| US | United States of America | available | 9/13 | reserved-range |
| UY | Uruguay | available | 11/12 | format-valid |
| UZ | Uzbekistan | available | 0/12 | format-valid |
| VA | Holy See | pending-name-review | 0/1 | format-valid |
| VC | Saint Vincent and the Grenadines | available | 0/12 | reserved-range |
| VE | Venezuela, Bolivarian Republic of | available | 0/12 | format-valid |
| VG | Virgin Islands (British) | pending-name-review | 0/2 | reserved-range |
| VI | Virgin Islands (U.S.) | available | 1/6 | reserved-range |
| VN | Viet Nam | available | 0/12 | format-valid |
| VU | Vanuatu | available | 0/9 | format-valid |
| WF | Wallis and Futuna | pending-name-review | 1/3 | format-valid |
| WS | Samoa | available | 0/12 | format-valid |
| YE | Yemen | available | 0/12 | format-valid |
| YT | Mayotte | available | 7/12 | format-valid |
| ZA | South Africa | available | 9/12 | format-valid |
| ZM | Zambia | available | 0/12 | format-valid |
| ZW | Zimbabwe | available | 0/12 | format-valid |

The current API exposes `GET /people`; it does not have a country-capability endpoint. This versioned table is the discoverable coverage reference for the beta. See the [API contract](api.md) for request and response rules and the [geographic data notes](geographic-data.md) for provenance and limitations.
