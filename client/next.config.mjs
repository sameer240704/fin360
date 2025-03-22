/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "ui.aceternity.com"
            },
            {
                protocol: "https",
                hostname: "clunyfarm.co.za"
            },
            {
                protocol: "https",
                hostname: "www.devdiscourse.com",
            },
            {
                protocol: "https",
                hostname: "www.livemint.com",
            },
            {
                protocol: "https",
                hostname: "images.indianexpress.com"
            },
            {
                protocol: "https",
                hostname: "images.news18.com"
            },
            {
                protocol: "https",
                hostname: "www.businessinsider.in"
            },
            {
                protocol: "https",
                hostname: "blogs.sas.com"
            }
        ],
    },
    async redirects() {
        return [
            {
                source: "/",
                destination: "/en",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
