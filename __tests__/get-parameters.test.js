/**
 * Unit tests for src/get-parameters/main.js
 */
import { jest } from '@jest/globals'

const core = await import('../__fixtures__/core.js')
const ssm = await import('../__fixtures__/ssm.js')

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@aws-sdk/client-ssm', () => ssm)
jest.unstable_mockModule('lodash.chunk', () => ({
  default: (arr, size) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }
}))

const { run } = await import('../src/get-parameters/main.js')

function mockInputs(inputs) {
  core.getInput.mockImplementation((name, opts) => {
    if (opts?.required && !(name in inputs)) {
      throw new Error(`Input required and not supplied: ${name}`)
    }
    return inputs[name] ?? ''
  })
}

describe('get-parameters run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retrieves a single parameter and exports it', async () => {
    mockInputs({
      'parameter-pairs': '/my/param=MY_PARAM',
      'with-decryption': 'true'
    })
    ssm.mockSend.mockResolvedValue({
      Parameters: [{ Name: '/my/param', Value: 'hello' }]
    })

    await run()

    expect(ssm.mockSend).toHaveBeenCalledTimes(1)
    const cmd = ssm.mockSend.mock.calls[0][0]
    expect(cmd).toBeInstanceOf(ssm.GetParametersCommand)
    expect(cmd.input).toEqual({
      Names: ['/my/param'],
      WithDecryption: true
    })
    expect(core.setSecret).toHaveBeenCalledWith('hello')
    expect(core.exportVariable).toHaveBeenCalledWith('MY_PARAM', 'hello')
  })

  it('handles multiple parameters', async () => {
    mockInputs({
      'parameter-pairs': '/a=A_VAR, /b=B_VAR',
      'with-decryption': 'true'
    })
    ssm.mockSend.mockResolvedValue({
      Parameters: [
        { Name: '/a', Value: 'val_a' },
        { Name: '/b', Value: 'val_b' }
      ]
    })

    await run()

    expect(core.exportVariable).toHaveBeenCalledWith('A_VAR', 'val_a')
    expect(core.exportVariable).toHaveBeenCalledWith('B_VAR', 'val_b')
  })

  it('chunks parameters in groups of 10', async () => {
    const pairs = Array.from({ length: 12 }, (_, i) => `/p${i}=VAR_${i}`).join(
      ','
    )
    mockInputs({ 'parameter-pairs': pairs, 'with-decryption': 'true' })
    ssm.mockSend.mockResolvedValue({ Parameters: [] })

    await run()

    expect(ssm.mockSend).toHaveBeenCalledTimes(2)
    expect(ssm.mockSend.mock.calls[0][0].input.Names).toHaveLength(10)
    expect(ssm.mockSend.mock.calls[1][0].input.Names).toHaveLength(2)
  })

  it('does not set secrets when with-decryption is false', async () => {
    mockInputs({
      'parameter-pairs': '/my/param=MY_PARAM',
      'with-decryption': 'false'
    })
    ssm.mockSend.mockResolvedValue({
      Parameters: [{ Name: '/my/param', Value: 'hello' }]
    })

    await run()

    expect(core.setSecret).not.toHaveBeenCalled()
    expect(core.exportVariable).toHaveBeenCalledWith('MY_PARAM', 'hello')
    expect(ssm.mockSend.mock.calls[0][0].input.WithDecryption).toBe(false)
  })

  it('fails on malformed parameter-pairs', async () => {
    mockInputs({
      'parameter-pairs': 'no-equals-sign',
      'with-decryption': 'true'
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Incorrectly formatted parameter pair')
    )
  })

  it('handles empty response parameters gracefully', async () => {
    mockInputs({
      'parameter-pairs': '/missing=MISSING_VAR',
      'with-decryption': 'true'
    })
    ssm.mockSend.mockResolvedValue({ Parameters: [] })

    await run()

    expect(core.exportVariable).not.toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('logs error for invalid parameter (missing value)', async () => {
    mockInputs({
      'parameter-pairs': '/my/param=MY_PARAM',
      'with-decryption': 'true'
    })
    ssm.mockSend.mockResolvedValue({
      Parameters: [{ Name: '/my/param', Value: undefined }]
    })

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid parameter returned')
    )
    expect(core.exportVariable).not.toHaveBeenCalled()
  })
})
