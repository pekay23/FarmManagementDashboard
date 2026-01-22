/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === false,
});

const nextConfig = {
  reactStrictMode: true,
  // We don't need the SVG webpack rule here because 
  // you are using Base64 strings for logos, not importing .svg files directly.
};

module.exports = withPWA(nextConfig);
