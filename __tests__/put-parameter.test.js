/**
 * Unit tests for src/main.js
 */
import { jest } from '@jest/globals'

// Mock modules before importing the module under test
const core = await import('../__fixtures__/core.js')
const ssm = await import('../__fixtures__/ssm.js')

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@aws-sdk/client-ssm', () => ssm)

// Import the module under test AFTER mocking
const { run } = await import('../src/put-parameter/main.js')

function mockInputs(inputs) {
  core.getInput.mockImplementation((name, opts) => {
    if (opts?.required && !(name in inputs)) {
      throw new Error(`Input required and not supplied: ${name}`)
    }
    return inputs[name] ?? ''
  })
  core.getBooleanInput.mockImplementation((name, opts) => {
    if (opts?.required && !(name in inputs)) {
      throw new Error(`Input required and not supplied: ${name}`)
    }
    const val = inputs[name]
    if (val === 'true' || val === true) return true
    if (val === 'false' || val === false) return false
    return false
  })
}

describe('run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ssm.mockSend.mockResolvedValue({ Version: 1, Tier: 'Standard' })
  })

  it('successfully puts a String parameter', async () => {
    mockInputs({
      'ssm-path': '/my/param',
      'aws-region': 'us-east-1',
      'ssm-value': 'hello',
      'ssm-value-type': 'String',
      'ssm-value-overwrite': 'false',
      'ssm-value-description': 'A test param'
    })

    await run()

    expect(ssm.mockSend).toHaveBeenCalledTimes(1)
    const cmd = ssm.mockSend.mock.calls[0][0]
    expect(cmd).toBeInstanceOf(ssm.PutParameterCommand)
    expect(cmd.input).toEqual({
      Name: '/my/param',
      Value: 'hello',
      Type: 'String',
      Overwrite: false,
      Description: 'A test param'
    })
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      'Successfully Stored parameter in path [/my/param]'
    )
  })

  it('adds KeyId for SecureString with kms key', async () => {
    mockInputs({
      'ssm-path': '/secure/param',
      'aws-region': 'eu-west-1',
      'ssm-value': 'secret',
      'ssm-value-type': 'SecureString',
      'ssm-value-overwrite': 'true',
      'ssm-value-description': '',
      'ssm-kms-key-id': 'alias/my-key'
    })

    await run()

    const cmd = ssm.mockSend.mock.calls[0][0]
    expect(cmd.input.KeyId).toBe('alias/my-key')
    expect(cmd.input.Overwrite).toBe(true)
  })

  it('does not add KeyId for SecureString without kms key', async () => {
    mockInputs({
      'ssm-path': '/secure/param',
      'aws-region': 'us-east-1',
      'ssm-value': 'secret',
      'ssm-value-type': 'SecureString',
      'ssm-value-overwrite': 'false',
      'ssm-value-description': ''
    })

    await run()

    const cmd = ssm.mockSend.mock.calls[0][0]
    expect(cmd.input.KeyId).toBeUndefined()
  })

  it('does not add KeyId for String type even with kms key', async () => {
    mockInputs({
      'ssm-path': '/my/param',
      'aws-region': 'us-east-1',
      'ssm-value': 'val',
      'ssm-value-type': 'String',
      'ssm-value-overwrite': 'false',
      'ssm-value-description': '',
      'ssm-kms-key-id': 'alias/my-key'
    })

    await run()

    const cmd = ssm.mockSend.mock.calls[0][0]
    expect(cmd.input.KeyId).toBeUndefined()
  })

  it('calls setFailed when SSM client throws', async () => {
    mockInputs({
      'ssm-path': '/my/param',
      'aws-region': 'us-east-1',
      'ssm-value': 'val',
      'ssm-value-type': 'String',
      'ssm-value-overwrite': 'false',
      'ssm-value-description': ''
    })
    ssm.mockSend.mockRejectedValue(new Error('Access Denied'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Access Denied')
  })

  it('calls setFailed when required input is missing', async () => {
    mockInputs({})

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Input required and not supplied: ssm-path'
    )
  })
})
