const exec = require('child_process').exec;

const path = require('path');

const PLUGIN_ID = require('../plugin.json').id;

const NPM_TARGET = process.env.npm_lifecycle_event; //eslint-disable-line no-process-env
let mode = 'production';
let devtool = '';
if (NPM_TARGET === 'debug' || NPM_TARGET === 'debug:watch') {
    mode = 'development';
    devtool = 'source-map';
}

const plugins = [];
if (NPM_TARGET === 'build:watch' || NPM_TARGET === 'debug:watch') {
    plugins.push({
        apply: (compiler) => {
            compiler.hooks.watchRun.tap('WatchStartPlugin', () => {
                // eslint-disable-next-line no-console
                console.log('Change detected. Rebuilding webapp.');
            });
            compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                exec('cd .. && make deploy-from-watch', (err, stdout, stderr) => {
                    if (stdout) {
                        process.stdout.write(stdout);
                    }
                    if (stderr) {
                        process.stderr.write(stderr);
                    }
                });
            });
        },
    });
}

module.exports = {
    entry: [
        './src/index.tsx',
    ],
    resolve: {
        alias: {
            src: path.resolve(__dirname, './src/'),

            components: path.resolve(__dirname, 'node_modules/mattermost-webapp/components/'),
            actions: path.resolve(__dirname, 'node_modules/mattermost-webapp/actions/'),
            utils: path.resolve(__dirname, 'node_modules/mattermost-webapp/utils/'),
            stores: path.resolve(__dirname, 'node_modules/mattermost-webapp/stores/'),
            store: path.resolve(__dirname, 'node_modules/mattermost-webapp/store/'),
            selectors: path.resolve(__dirname, 'node_modules/mattermost-webapp/selectors/'),
            reducers: path.resolve(__dirname, 'node_modules/mattermost-webapp/reducers/'),
            plugins: path.resolve(__dirname, 'node_modules/mattermost-webapp/plugins/'),
            images: path.resolve(__dirname, 'node_modules/mattermost-webapp/images/'),
            i18n: path.resolve(__dirname, 'node_modules/mattermost-webapp/i18n/'),
            dispatcher: path.resolve(__dirname, 'node_modules/mattermost-webapp/dispatcher/'),
            client: path.resolve(__dirname, 'node_modules/mattermost-webapp/client/'),
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
                test: /\.(js|jsx|ts|tsx)$/,
                include: /node_modules\/mattermost-webapp/,
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
                    'style-loader',
                    {
                        loader: 'css-loader',
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                includePaths: ['node_modules/compass-mixins/lib', 'sass'],
                            },
                        },
                    },
                ],
            },
            {
                test: /\.(png|eot|tiff|svg|woff2|woff|ttf|gif|mp3|jpg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'files/[hash].[ext]',
                        },
                    },
                    {
                        loader: 'image-webpack-loader',
                        options: {},
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
        'react-router-dom': 'ReactRouterDom',

        //'mattermost-webapp': path.resolve(__dirname, 'node_modules/mattermost-webapp/'),
    },
    output: {
        devtoolNamespace: PLUGIN_ID,
        path: path.join(__dirname, '/dist'),
        publicPath: '/',
        filename: 'main.js',
    },
    devtool,
    mode,
    plugins,
};
