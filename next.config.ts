import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/proxy/:path*', // Ścieżka, której użyjesz w frontendzie
                destination: 'https://api.rotify.pl/api/v1/:path*', // Prawdziwe API
            },
        ];
    },
};

export default nextConfig;
