const webpack = require('webpack');
const { PyodidePlugin } = require("@pyodide/webpack-plugin");

const BASE_PATH = process.env.BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    distDir: 'static_export',
    basePath: BASE_PATH,
    poweredByHeader: false,
    reactStrictMode: true,
    trailingSlash: true,
    swcMinify: true,
    webpack: (config, _) => {
        // Add Support to import the raw text from Python files
        config.module.rules.push({
            test: /\.py$/,
            type: 'asset/source',
        });

        config.plugins.push(
            new webpack.DefinePlugin({
                'process.env.BASE_PATH': JSON.stringify(BASE_PATH),
            })
        );

        config.plugins.push(
            new PyodidePlugin(),
        );
        
        return config;
    },
};

module.exports = nextConfig
