const path = require('path');
const webpack = require('webpack');

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

// Helper to resolve package paths (works with npm, yarn, and pnpm)
const resolvePackagePath = (packageName, subPath = '') => {
    try {
        const packageJsonPath = require.resolve(`${packageName}/package.json`);
        const packageDir = path.dirname(packageJsonPath);
        return subPath ? path.join(packageDir, subPath) : packageDir;
    } catch {
        // Fallback to relative path for backwards compatibility
        return path.join(__dirname, '../../node_modules', packageName, subPath);
    }
};

// const STATIC_PATH = process.env.STATIC_PATH || '/static';

const commonHtmlWebpackPluginOptions = {
    // Google Tag Manager ID
    // Looks like 'GTM-XXXXXXX'
    gtm_id: process.env.GTM_ID || '',

    // Google Tag Manager env & auth info for alterative GTM environments
    // Looks like '&gtm_auth=0123456789abcdefghijklm&gtm_preview=env-00&gtm_cookies_win=x'
    // Taken from the middle of: GTM -> Admin -> Environments -> (environment) -> Get Snippet
    // Blank for production
    gtm_env_auth: process.env.GTM_ENV_AUTH || ''
};

const cssModuleExceptions = [
    /\.raw\.css$/, // Allow for overriding CSS classes from libraries
    /[\\/]driver\.js[\\/].*\.css$/ // driver.js CSS
];

const baseConfig = new ScratchWebpackConfigBuilder(
    {
        rootPath: path.resolve(__dirname),
        enableReact: true,
        enableTs: true,
        shouldSplitChunks: false,
        cssModuleExceptions
    })
    .setTarget('browserslist')
    .merge({
        output: {
            assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
            library: {
                name: 'GUI',
                type: 'umd2'
            },
            // Do not clean the JS files before building as we have two outputs to the same
            // dist directory (the regular and the standalone version)
            clean: false
        },
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify')
            }
        }
    })
    .addModuleRule({
        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
        resourceQuery: /^$/, // reject any query string
        type: 'asset' // let webpack decide on the best type of asset
    })
    .addPlugin(new webpack.DefinePlugin({
        'process.env.DEBUG': Boolean(process.env.DEBUG),
        'process.env.GA_ID': `"${process.env.GA_ID || 'UA-000000-01'}"`,
        'process.env.GTM_ENV_AUTH': `"${process.env.GTM_ENV_AUTH || ''}"`,
        'process.env.GTM_ID': process.env.GTM_ID ? `"${process.env.GTM_ID}"` : null
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: resolvePackagePath('scratch-blocks', 'media'),
                to: 'static/blocks-media/default'
            },
            {
                from: resolvePackagePath('scratch-blocks', 'media'),
                to: 'static/blocks-media/high-contrast'
            },
            {
                // overwrite some of the default block media with high-contrast versions
                // this entry must come after copying scratch-blocks/media into the high-contrast directory
                from: 'src/lib/settings/color-mode/high-contrast/blocks-media',
                to: 'static/blocks-media/high-contrast',
                force: true
            },
            {
                context: resolvePackagePath('@scratch/scratch-vm', 'dist/web'),
                from: 'extension-worker.{js,js.map}',
                noErrorOnMissing: true
            },
            {
                context: resolvePackagePath('scratch-storage', 'dist/web'),
                from: 'chunks/fetch-worker.*.{js,js.map}',
                noErrorOnMissing: true
            },
            {
                context: resolvePackagePath('scratch-storage', 'dist/web'),
                from: 'chunks/vendors-*.{js,js.map}',
                noErrorOnMissing: true
            },
            {
                from: resolvePackagePath('@mediapipe/face_detection'),
                to: 'chunks/mediapipe/face_detection'
            }
        ]
    }));

if (!process.env.CI) {
    baseConfig.addPlugin(new webpack.ProgressPlugin());
}

// Helper function to patch a single webpack rule for classic JSX runtime
function patchSingleRule(rule) {
    // Find babel-loader rules (they have use.loader containing 'babel-loader')
    if (rule.use && Array.isArray(rule.use)) {
        return {
            ...rule,
            use: rule.use.map(loader => {
                if (loader.loader && loader.loader.includes('babel-loader')) {
                    const newOptions = {...loader.options};
                    if (newOptions.presets) {
                        newOptions.presets = newOptions.presets.map(preset => {
                            if (Array.isArray(preset) && preset[0]) {
                                const presetName = typeof preset[0] === 'string' ? preset[0] : '';
                                if (presetName.includes('preset-react') || presetName.includes('@babel/react')) {
                                    return [preset[0], {...(preset[1] || {}), runtime: 'classic'}];
                                }
                            }
                            if (typeof preset === 'string' &&
                                (preset.includes('preset-react') || preset.includes('@babel/react'))) {
                                return [preset, {runtime: 'classic'}];
                            }
                            return preset;
                        });
                    }
                    return {...loader, options: newOptions};
                }
                return loader;
            })
        };
    }
    // Handle single loader object (loader property directly on rule)
    if (rule.loader && rule.loader.includes('babel-loader')) {
        const newOptions = {...(rule.options || {})};
        if (newOptions.presets) {
            newOptions.presets = newOptions.presets.map(preset => {
                if (Array.isArray(preset) && preset[0]) {
                    const presetName = typeof preset[0] === 'string' ? preset[0] : '';
                    if (presetName.includes('preset-react') || presetName.includes('@babel/react')) {
                        return [preset[0], {...(preset[1] || {}), runtime: 'classic'}];
                    }
                }
                if (typeof preset === 'string' &&
                    (preset.includes('preset-react') || preset.includes('@babel/react'))) {
                    return [preset, {runtime: 'classic'}];
                }
                return preset;
            });
        }
        return {...rule, options: newOptions};
    }
    return rule;
}

// Helper function to patch babel-loader to use classic JSX runtime
// This is necessary because the UMD builds expect React.createElement, not jsx-runtime
// Note: This doesn't fix pre-compiled dependencies that already use jsx-runtime.
// For those, we provide jsx/jsxs on window.React in ScratchGUIClient.tsx
function patchBabelForClassicJSX(webpackConfig) {
    webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
        if (rule.oneOf) {
            return {
                ...rule,
                oneOf: rule.oneOf.map(innerRule => patchSingleRule(innerRule))
            };
        }
        return patchSingleRule(rule);
    });
    return webpackConfig;
}

// build the shipping library in `dist/`
const distConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-gui': path.join(__dirname, 'src/index.ts')
        },
        output: {
            // We need the public path to be relative, because of scratch-desktop and scratch-android
            // - if the publicPath is static here (defaults to `/`), they are unable to load their assets,
            // which depend on a relative path resolution.
            // (e.g. `/tmp/*path-to-packaged-dist*/static/assets` in scratch-desktop)
            publicPath: 'auto',
            path: path.resolve(__dirname, 'dist')
        }
    })
    .addExternals([
        // Use function-based externals to handle all react-related imports
        function ({request}, callback) {
            // Handle react and all its subpaths (jsx-runtime, jsx-dev-runtime, etc.)
            if (request === 'react' || request.startsWith('react/')) {
                return callback(null, {
                    commonjs: request,
                    commonjs2: request,
                    amd: request,
                    root: 'React'
                });
            }
            // Handle react-dom and all its subpaths
            if (request === 'react-dom' || request.startsWith('react-dom/')) {
                return callback(null, {
                    commonjs: request,
                    commonjs2: request,
                    amd: request,
                    root: 'ReactDOM'
                });
            }
            // Handle redux
            if (request === 'redux') {
                return callback(null, {
                    commonjs: 'redux',
                    commonjs2: 'redux',
                    amd: 'redux',
                    root: 'Redux'
                });
            }
            // Handle react-redux
            if (request === 'react-redux') {
                return callback(null, {
                    commonjs: 'react-redux',
                    commonjs2: 'react-redux',
                    amd: 'react-redux',
                    root: 'ReactRedux'
                });
            }
            callback();
        }
    ])
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/lib/libraries/*.json',
                    to: 'libraries',
                    flatten: true
                }
            ]
        })
    );

// build the shipping library in `dist/` bundled with react, react-dom, redux, etc.
const distStandaloneConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-gui-standalone': path.join(__dirname, 'src/index-standalone.tsx')
        },
        output: {
            path: path.resolve(__dirname, 'dist')
        }
    });

// Apply classic JSX runtime to all builds
// This ensures compatibility when loaded as UMD modules with external React
const distWebpackConfig = patchBabelForClassicJSX(distConfig.get());
const standaloneWebpackConfig = patchBabelForClassicJSX(distStandaloneConfig.get());

// build the examples and debugging tools in `build/`
const buildConfig = baseConfig.clone()
    .enableDevServer(process.env.PORT || 8601)
    .merge({
        entry: {
            gui: './src/playground/index.jsx',
            guistandalone: './src/playground/standalone.jsx',
            blocksonly: './src/playground/blocks-only.jsx',
            compatibilitytesting: './src/playground/compatibility-testing.jsx',
            player: './src/playground/player.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build'),

            // This output is loaded using a file:// scheme from the local file system.
            // Having `publicPath: '/'` (the default) means the `gui.js` file in `build/index.html`
            // would be looked for at the root of the filesystem, which is incorrect.
            // Hence, we're resetting the public path to be relative.
            publicPath: ''
        }
    })
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['gui'],
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['guistandalone'],
        filename: 'standalone.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Standalone Mode'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['blocksonly'],
        filename: 'blocks-only.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Blocks Only Example'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['compatibilitytesting'],
        filename: 'compatibility-testing.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Compatibility Testing'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['player'],
        filename: 'player.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Player Example'
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'static',
                to: 'static'
            },
            {
                from: 'extensions/**',
                to: 'static',
                context: 'src/examples'
            }
        ]
    }));

// Apply classic JSX runtime to build config as well for consistency
const devWebpackConfig = patchBabelForClassicJSX(buildConfig.get());

// Skip building `dist/` unless explicitly requested
// It roughly doubles build time and isn't needed for `scratch-gui` development
// If you need non-production `dist/` for local dev, such as for `scratch-www` work, you can run something like:
// `BUILD_MODE=dist npm run build`
const buildDist = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist';

let config;
switch (process.env.BUILD_TYPE) {
case 'dist': config = distWebpackConfig; break;
case 'dist-standalone': config = standaloneWebpackConfig; break;
default: config = devWebpackConfig; break;
}

module.exports = buildDist ? config : devWebpackConfig;
