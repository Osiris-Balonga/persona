import { projectPeopleResponse, type FieldPath } from '../../src/field-selection.js'
import type { GeneratedPeopleResponse } from '../../src/generated-person.js'

declare const generated: GeneratedPeopleResponse
const nested: FieldPath = 'location.coordinates.latitude'
// @ts-expect-error Internal fields are not part of the public selection contract.
const internal: FieldPath = 'appearance'
// @ts-expect-error Arbitrary paths are not valid public fields.
const unknown: FieldPath = 'name.middle'
const full = projectPeopleResponse(generated)
const fullName: string = full.results[0].name.full
const partial = projectPeopleResponse(generated, [nested, 'name.first', 'picture.thumbnail'])
const firstName: string | undefined = partial.results[0].name?.first
// @ts-expect-error Selected results do not promise all nested name properties.
const lastName: string = partial.results[0].name.last
const picture: string | null | undefined = partial.results[0].picture?.thumbnail
void [internal, unknown, fullName, firstName, lastName, picture]
