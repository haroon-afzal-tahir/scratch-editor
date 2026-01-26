module.exports = {
    presets: [
        '@babel/preset-env',
        ['@babel/preset-react', {
            // Use classic runtime to avoid jsx-runtime issues in standalone bundle
            runtime: 'classic'
        }]
    ]
};
