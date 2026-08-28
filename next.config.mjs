// CHANGE this to match the exact name of your GitHub repository
const repoName = 'tic-tac-toe-variations'

// This is true automatically when GitHub Actions builds the site, false on your own computer
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: isGithubActions ? `/${repoName}` : '',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
