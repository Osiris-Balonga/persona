import { describe, expect, it } from 'vitest'
import { decisionSteps } from '../../review/decision-flow.js'

describe('portrait review decision flow', () => {
  it('records edits before a first approval', () => {
    expect(decisionSteps('ready-for-review', 'approved', true, false)).toEqual(['metadata', 'decide'])
    expect(decisionSteps('ready-for-review', 'approved', false, false)).toEqual(['decide'])
  })

  it('keeps an approval when only visual tags or tone change', () => {
    expect(decisionSteps('approved', 'approved', true, true)).toEqual(['visual'])
    expect(decisionSteps('approved', 'approved', true, false)).toEqual(['metadata', 'decide'])
    expect(decisionSteps('approved', 'approved', false, false)).toEqual([])
  })

  it('reverses an earlier decision through the existing reopen action', () => {
    expect(decisionSteps('approved', 'rejected', false, false)).toEqual(['reopen', 'decide'])
    expect(decisionSteps('rejected', 'approved', false, false)).toEqual(['reopen', 'decide'])
    expect(decisionSteps('rejected', 'approved', true, true)).toEqual(['metadata', 'decide'])
  })

  it('records a changed production collection with the decision', () => {
    expect(decisionSteps('ready-for-review', 'approved', false, false, true)).toEqual(['collection', 'decide'])
    expect(decisionSteps('approved', 'approved', false, false, true)).toEqual(['collection'])
    expect(decisionSteps('approved', 'approved', true, true, true)).toEqual(['collection', 'visual'])
    expect(decisionSteps('approved', 'rejected', false, false, true)).toEqual(['collection', 'reopen', 'decide'])
  })
})
