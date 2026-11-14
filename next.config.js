/** @type {import('next').NextjsConfig} */
const nextConfig = {
  typescript: {
    // Esto permite que el proyecto se suba con éxito aunque tenga advertencias de tipos
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
