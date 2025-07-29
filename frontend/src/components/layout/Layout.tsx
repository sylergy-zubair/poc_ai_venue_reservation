import React from 'react';
import Head from 'next/head';
import { clsx } from 'clsx';
import Header from './Header';
import Footer from './Footer';
import type { BaseComponentProps } from '../../types';

interface LayoutProps extends BaseComponentProps {
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  fullWidth?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  description = 'AI-powered venue search and booking platform',
  canonical,
  noIndex = false,
  fullWidth = false,
  className,
}) => {
  const pageTitle = title ? `${title} | Venue Booking` : 'Venue Booking - AI-Powered Venue Search';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        
        {/* Canonical URL */}
        {canonical && <link rel="canonical" href={canonical} />}
        
        {/* Robots */}
        {noIndex && <meta name="robots" content="noindex, nofollow" />}
        
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        
        <main className={clsx(
          'flex-1',
          !fullWidth && 'container-responsive',
          className
        )}>
          {children}
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Layout;