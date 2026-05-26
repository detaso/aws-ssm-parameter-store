import * as core from '@actions/core'
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm'

/**
 * The main function for the action.
 *
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    const ssmPath = core.getInput('ssm-path', { required: true })
    core.info(`Storing Variable in path [${ssmPath}]`)

    const region = core.getInput('aws-region')
    core.debug(`Setting aws-region [${region}]`)

    const ssm = new SSMClient({ region })

    const params = {
      Name: ssmPath,
      Value: core.getInput('ssm-value', { required: true }),
      Type: core.getInput('ssm-value-type', { required: true }),
      Overwrite: core.getBooleanInput('ssm-value-overwrite', {
        required: true
      }),
      Description: core.getInput('ssm-value-description')
    }

    core.debug(
      `Prepared parameters for SSM parameter update. ${JSON.stringify(params)}`
    )

    const keyId = core.getInput('ssm-kms-key-id')
    if (params.Type === 'SecureString' && keyId !== '') {
      core.debug(`Setting the KeyId to ${keyId}`)
      params.KeyId = keyId
    }

    const result = await ssm.send(new PutParameterCommand(params))

    core.debug(
      `Parameter details Version [${result.Version}] Tier [${result.Tier}]`
    )
    core.info(`Successfully Stored parameter in path [${ssmPath}]`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
