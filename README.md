# AWS SSM Parameter Store GitHub Actions

A collection of GitHub Actions for working with AWS Systems Manager Parameter
Store.

| Action                              | Description                                                      |
| ----------------------------------- | ---------------------------------------------------------------- |
| [`put-parameter`](#put-parameter)   | Store a parameter in SSM Parameter Store                         |
| [`get-parameters`](#get-parameters) | Retrieve parameters from SSM and export as environment variables |

## Put Parameter

Store a value in AWS Systems Manager Parameter Store. Useful for secret
management with infrastructure as code — inject secrets from GitHub Actions
without storing them in Terraform state or needing to pre-populate
CloudFormation parameters.

### Inputs

| Name                    | Required | Description                                               | Default  |
| ----------------------- | -------- | --------------------------------------------------------- | -------- |
| `aws-region`            | Yes      | The AWS region to use                                     |          |
| `ssm-path`              | Yes      | The SSM parameter path/name                               |          |
| `ssm-value`             | Yes      | The value to store                                        |          |
| `ssm-value-type`        | Yes      | Parameter type: `String`, `StringList`, or `SecureString` | `String` |
| `ssm-value-overwrite`   | Yes      | Whether to overwrite an existing parameter                | `false`  |
| `ssm-value-description` | No       | A description for the parameter                           |          |
| `ssm-kms-key-id`        | No       | KMS key ID/ARN for SecureString encryption                |          |

### Example

```yaml
steps:
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: eu-west-1

  - name: Store secret in SSM
    uses: detaso/aws-ssm-parameter-store/put-parameter@v1
    with:
      aws-region: eu-west-1
      ssm-path: /myapp/database-password
      ssm-value: ${{ secrets.DB_PASSWORD }}
      ssm-value-type: SecureString
      ssm-value-overwrite: 'true'
```

### Required IAM Permissions

Your AWS User/Role must allow the `ssm:PutParameter` action:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:PutParameter",
      "Resource": "arn:aws:ssm:*:*:parameter/myapp/*"
    }
  ]
}
```

## Get Parameters

Retrieve one or more parameters from AWS SSM Parameter Store and export them as
environment variables. Optimized to use the fewest possible API calls by
batching parameters in groups of 10 (the SSM API limit).

### Inputs

| Name              | Required | Description                                     | Default |
| ----------------- | -------- | ----------------------------------------------- | ------- |
| `aws-region`      | Yes      | The AWS region to use                           |         |
| `parameter-pairs` | Yes      | Comma-separated pairs: `/ssm/path=ENV_VAR_NAME` |         |
| `with-decryption` | No       | Whether to decrypt SecureString parameters      | `true`  |

### Example

```yaml
steps:
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: us-east-1

  - name: Get SSM Parameters
    uses: detaso/aws-ssm-parameter-store/get-parameters@v1
    with:
      aws-region: eu-east-1
      parameter-pairs: |
        /myapp/database-url = DATABASE_URL,
        /myapp/api-key = API_KEY
      with-decryption: 'true'

  - name: Use parameters
    run: echo "Database is at $DATABASE_URL"
```

The part before `=` is the SSM parameter name, and after is the environment
variable name for the workflow. Whitespace and newlines are trimmed
automatically.

### Required IAM Permissions

Your AWS User/Role must allow the `ssm:GetParameters` action:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:GetParameters",
      "Resource": "arn:aws:ssm:*:*:parameter/myapp/*"
    }
  ]
}
```

## Development

1. Install dependencies

   ```bash
   npm install
   ```

1. Run tests

   ```bash
   npm test
   ```

1. Build the action bundles

   ```bash
   npm run package
   ```

## Credit

- Put Parameter action originally by [@dwardu89](https://github.com/dwardu89)
- Get Parameters action inspired by
  [@dkershner6](https://github.com/dkershner6/aws-ssm-getparameters-action)
