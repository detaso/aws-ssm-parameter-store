/**
 * This file is used to mock the `@aws-sdk/client-ssm` module in tests.
 */
import { jest } from '@jest/globals'

export const mockSend = jest.fn()

export class SSMClient {
  constructor(config) {
    this.config = config
  }
  send = mockSend
}

export class PutParameterCommand {
  constructor(input) {
    this.input = input
  }
}

export class GetParametersCommand {
  constructor(input) {
    this.input = input
  }
}
