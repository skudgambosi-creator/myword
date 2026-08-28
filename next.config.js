/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Belt and braces alongside Next's automatic file tracing: the exported-
  // PDF routes read local .ttf files at runtime (lib/export/fonts) rather
  // than fetching a font remotely, so guarantee they're bundled into these
  // serverless functions even if the tracer's static analysis doesn't
  // follow the path through react-pdf's own fs.readFileSync call.
  outputFileTracingIncludes: {
    '/api/groups/[id]/export': ['./lib/export/fonts/**'],
    '/api/jobs/export/process': ['./lib/export/fonts/**'],
  },
}

module.exports = nextConfig
