import * as core from '@actions/core'
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm'
import chunk from 'lodash.chunk'

const MAX_SSM_GETPARAMETERS_COUNT = 10

/**
 * Parse and validate the action inputs.
 *
 * @returns {{ parameterPairs: [string, string][], withDecryption: boolean }}
 */
function validateParams() {
  const parameterPairsParam = core.getInput('parameter-pairs', {
    required: true
  })
  const parameterPairsStrings = parameterPairsParam.split(',')
  const parameterPairs = parameterPairsStrings.map((pairString) => {
    const pair = pairString.trim().split('=')
    if (pair.length < 2) {
      throw new Error(
        'Incorrectly formatted parameter pair, make sure the parameterPairs string is in the format "/ssm/paramName=ENV_VARIABLE_NAME,/ssm/paramName2=ENV_VARIABLE_NAME2"'
      )
    }
    return pair.map((p) => p.trim())
  })

  const withDecryptionParam = core.getInput('with-decryption')
  const withDecryption = withDecryptionParam !== 'false'

  return { parameterPairs, withDecryption }
}

/**
 * Process a chunk of parameter pairs by calling GetParameters.
 */
async function processChunk(client, parameterPairChunk, withDecryption) {
  const parameterMap = Object.fromEntries(parameterPairChunk)

  const command = new GetParametersCommand({
    Names: Object.keys(parameterMap),
    WithDecryption: withDecryption
  })

  const response = await client.send(command)

  if (response?.Parameters && response.Parameters.length > 0) {
    for (const param of response.Parameters) {
      const name = param?.Name
      const value = param?.Value

      if (!name || !value) {
        core.error(`Invalid parameter returned, name: ${name}`)
        continue
      }

      if (withDecryption) {
        core.setSecret(value)
      }

      core.exportVariable(parameterMap[name], value)
      core.info(
        `Env variable ${parameterMap[name]} set with value from ssm parameterName ${name}`
      )
    }
  }
  core.info('Chunk successfully processed')
}

/**
 * The main function for the get-parameters action.
 *
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    const { parameterPairs, withDecryption } = validateParams()

    const parameterPairChunks = chunk(
      parameterPairs,
      MAX_SSM_GETPARAMETERS_COUNT
    )
    core.info(`${parameterPairChunks.length} chunks of parameters to retrieve`)

    const region = core.getInput('aws-region')
    const client = new SSMClient(region ? { region } : {})

    for (const parameterPairChunk of parameterPairChunks) {
      await processChunk(client, parameterPairChunk, withDecryption)
    }

    core.info('Job Complete')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
