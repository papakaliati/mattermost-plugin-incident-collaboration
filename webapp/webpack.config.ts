import {exec} from 'child_process';
import * as webpack from 'webpack'
import * as path from 'path';

import manifest from './src/manifest.js';

// buildTimestamp uniquely identifies CSS assets injected into the header. This same value is
// then exposed as a global constant, allowing the plugin to unambiguously remove old assets
// that can't be cleaned up on uninitialize.
const buildTimestamp = Number(new Date());

const config: webpack.Configuration = {
    entry: [
        './src/index.tsx',
    ],
    resolve: {
        alias: {
            src: path.resolve(__dirname, './src/'),
        },
        modules: [
            'src',
            'node_modules',
        ],
        extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,

                        // Babel configuration is in babel.config.js because jest requires it to be there.
                    },
                },
            },
            {
                test: /\.scss$/,
                use: [
                    {loader: 'style-loader', options: {attributes: {class: manifest.Id + '-style ' + buildTimestamp}}},
                    {
                        loader: 'css-loader',
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            includePaths: ['node_modules/compass-mixins/lib', 'sass'],
                        },
                    },
                ],
            },
        ],
    },
    externals: {
        react: 'React',
        redux: 'Redux',
        'react-redux': 'ReactRedux',
        'prop-types': 'PropTypes',
        'react-bootstrap': 'ReactBootstrap',
    },
    output: {
        path: path.join(__dirname, '/dist'),
        publicPath: '/',
        filename: 'main.js',
    },
    plugins: [
        new webpack.DefinePlugin({
            'BUILD_TIMESTAMP': buildTimestamp,
        }),
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                    exec('cd .. && make reset', (err, stdout, stderr) => {
                        if (stdout) {
                            process.stdout.write(stdout);
                        }
                        if (stderr) {
                            process.stderr.write(stderr);
                        }
                    });
                });
            },
        },
    ],
};

const NPM_TARGET = process.env.npm_lifecycle_event; //eslint-disable-line no-process-env
if (NPM_TARGET === 'development') {
    config.mode = 'development';
    config.devtool = 'source-map';
}

export default config;
