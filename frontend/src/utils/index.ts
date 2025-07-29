/**
 * Utility functions for the frontend application
 */

// Format currency values
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch (error) {
    console.warn('Currency formatting failed:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
};

// Format dates
export const formatDate = (
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  },
  locale: string = 'en-US'
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.warn('Date formatting failed:', error);
    return date.toString();
  }
};

// Format time
export const formatTime = (
  time: string,
  locale: string = 'en-US'
): string => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (error) {
    console.warn('Time formatting failed:', error);
    return time;
  }
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// Generate initials from name
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Sleep utility
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Generate random ID
export const generateId = (length: number = 8): string => {
  return Math.random().toString(36).substr(2, length);
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (basic)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Clean and format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

// Parse search query for quick extraction
export const parseSearchQuery = (query: string): {
  location?: string;
  capacity?: number;
  date?: string;
  eventType?: string;
} => {
  const result: any = {};
  const lowerQuery = query.toLowerCase();
  
  // Extract capacity
  const capacityMatch = lowerQuery.match(/(\d+)\s*(?:people|persons|attendees|guests)/);
  if (capacityMatch) {
    result.capacity = parseInt(capacityMatch[1]);
  }
  
  // Extract location patterns
  const locationPatterns = [
    /in\s+([a-zA-Z\s]+?)(?:\s+for|\s+on|\s+next|\s*$)/,
    /at\s+([a-zA-Z\s]+?)(?:\s+for|\s+on|\s+next|\s*$)/,
  ];
  
  for (const pattern of locationPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      result.location = match[1].trim();
      break;
    }
  }
  
  // Extract event types
  const eventTypes = ['conference', 'meeting', 'wedding', 'party', 'seminar', 'workshop'];
  for (const type of eventTypes) {
    if (lowerQuery.includes(type)) {
      result.eventType = type;
      break;
    }
  }
  
  // Extract date patterns (basic)
  const datePatterns = [
    /tomorrow/,
    /next week/,
    /next month/,
    /today/
  ];
  
  for (const pattern of datePatterns) {
    if (pattern.test(lowerQuery)) {
      const now = new Date();
      if (pattern.source === 'tomorrow') {
        now.setDate(now.getDate() + 1);
        result.date = now.toISOString().split('T')[0];
      } else if (pattern.source === 'next week') {
        now.setDate(now.getDate() + 7);
        result.date = now.toISOString().split('T')[0];
      } else if (pattern.source === 'next month') {
        now.setMonth(now.getMonth() + 1);
        result.date = now.toISOString().split('T')[0];
      } else if (pattern.source === 'today') {
        result.date = now.toISOString().split('T')[0];
      }
      break;
    }
  }
  
  return result;
};

// Local storage utilities
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue || null;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.warn('Failed to get from localStorage:', error);
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to set localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
};

// URL utilities
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

// Build URL with query parameters
export const buildUrl = (baseUrl: string, params: Record<string, any>): string => {
  const url = new URL(baseUrl);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  
  return url.toString();
};

// Browser detection
export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return null;
  
  const userAgent = navigator.userAgent;
  
  return {
    userAgent,
    isChrome: /Chrome/.test(userAgent),
    isFirefox: /Firefox/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
    isEdge: /Edge/.test(userAgent),
    isMobile: /Mobile|Android|iOS/.test(userAgent),
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
  };
};

// Performance utilities
export const measurePerformance = (name: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`${name} took ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};

// Error boundary utility
export const captureError = (error: Error, context?: Record<string, any>) => {
  console.error('Captured error:', error, context);
  
  // Here you could integrate with error reporting services like Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Sentry.captureException(error, { extra: context });
  }
};

// Feature flag utility
export const isFeatureEnabled = (featureName: string): boolean => {
  const envVar = `NEXT_PUBLIC_ENABLE_${featureName.toUpperCase()}`;
  return process.env[envVar] === 'true';
};