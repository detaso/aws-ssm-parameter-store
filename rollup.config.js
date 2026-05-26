// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const shared = {
  plugins: [commonjs(), json(), nodeResolve({ preferBuiltins: true })]
}

const config = [
  {
    input: 'src/put-parameter/index.js',
    output: {
      esModule: true,
      file: 'dist/put-parameter/index.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true
    },
    ...shared
  },
  {
    input: 'src/get-parameters/index.js',
    output: {
      esModule: true,
      file: 'dist/get-parameters/index.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true
    },
    ...shared
  }
]

export default config
