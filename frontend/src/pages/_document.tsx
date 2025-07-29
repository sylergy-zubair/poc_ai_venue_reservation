import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="AI-powered venue search and booking platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Preload critical fonts */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
        
        {/* Performance optimizations */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* SEO meta tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Venue Booking Team" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Venue Booking" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <body className="antialiased bg-gray-50">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}