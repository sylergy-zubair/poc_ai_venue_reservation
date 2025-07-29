import React, { useState, useEffect } from 'react';

/**
 * API Monitoring Dashboard
 * Phase 4: Debug interface for monitoring API calls and performance
 */

interface ApiCall {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
  duration: number;
  requestSize: number;
  responseSize: number;
  error?: string;
  userAgent?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
}

interface ApiMetrics {
  totalCalls: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  p95ResponseTime: number;
  throughput: number; // requests per minute
}

interface ApiMonitoringDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  apiCalls?: ApiCall[];
}

const ApiMonitoringDashboard: React.FC<ApiMonitoringDashboardProps> = ({
  isVisible,
  onClose,
  apiCalls = []
}) => {
  const [filters, setFilters] = useState({
    endpoint: 'all',
    status: 'all',
    timeRange: '1h',
    method: 'all'
  });
  const [selectedCall, setSelectedCall] = useState<ApiCall | null>(null);
  const [sortBy, setSortBy] = useState<'timestamp' | 'duration' | 'status'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Calculate metrics from API calls
  const calculateMetrics = (calls: ApiCall[]): ApiMetrics => {
    if (calls.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        throughput: 0
      };
    }

    const successfulCalls = calls.filter(call => call.status >= 200 && call.status < 400);
    const durations = calls.map(call => call.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentCalls = calls.filter(call => new Date(call.timestamp) > oneHourAgo);

    return {
      totalCalls: calls.length,
      successRate: (successfulCalls.length / calls.length) * 100,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      errorRate: ((calls.length - successfulCalls.length) / calls.length) * 100,
      p95ResponseTime: durations[p95Index] || 0,
      throughput: recentCalls.length
    };
  };

  // Filter API calls based on current filters
  const filteredCalls = apiCalls.filter(call => {
    if (filters.endpoint !== 'all' && !call.endpoint.includes(filters.endpoint)) return false;
    if (filters.status !== 'all') {
      if (filters.status === 'success' && (call.status < 200 || call.status >= 400)) return false;
      if (filters.status === 'error' && call.status >= 200 && call.status < 400) return false;
    }
    if (filters.method !== 'all' && call.method !== filters.method) return false;
    
    // Time range filtering
    const now = new Date();
    const callTime = new Date(call.timestamp);
    const timeRangeMs = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    }[filters.timeRange] || 60 * 60 * 1000;
    
    return (now.getTime() - callTime.getTime()) <= timeRangeMs;
  });

  // Sort filtered calls
  const sortedCalls = [...filteredCalls].sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];
    
    if (sortBy === 'timestamp') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const metrics = calculateMetrics(filteredCalls);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
    if (status >= 300 && status < 400) return 'text-blue-600 bg-blue-50';
    if (status >= 400 && status < 500) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getDurationColor = (duration: number) => {
    if (duration < 500) return 'text-green-600';
    if (duration < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="api-monitoring-overlay">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-7xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">API Monitoring Dashboard</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300"
            data-testid="api-monitoring-close"
          >
            ✕
          </button>
        </div>

        {/* Metrics Summary */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center" data-testid="metric-total-calls">
              <div className="text-2xl font-bold text-gray-800">{metrics.totalCalls}</div>
              <div className="text-sm text-gray-600">Total Calls</div>
            </div>
            <div className="text-center" data-testid="metric-success-rate">
              <div className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center" data-testid="metric-avg-response-time">
              <div className={`text-2xl font-bold ${getDurationColor(metrics.averageResponseTime)}`}>
                {metrics.averageResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
            <div className="text-center" data-testid="metric-error-rate">
              <div className="text-2xl font-bold text-red-600">{metrics.errorRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>
            <div className="text-center" data-testid="metric-p95">
              <div className={`text-2xl font-bold ${getDurationColor(metrics.p95ResponseTime)}`}>
                {metrics.p95ResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">P95 Response</div>
            </div>
            <div className="text-center" data-testid="metric-throughput">
              <div className="text-2xl font-bold text-blue-600">{metrics.throughput}</div>
              <div className="text-sm text-gray-600">Req/Hour</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={filters.endpoint}
              onChange={(e) => setFilters(prev => ({ ...prev, endpoint: e.target.value }))}
              className="px-3 py-2 border rounded text-sm"
              data-testid="filter-endpoint"
            >
              <option value="all">All Endpoints</option>
              <option value="/api/extract">Entity Extraction</option>
              <option value="/api/venues/search">Venue Search</option>
              <option value="/api/venues/book">Booking</option>
              <option value="/api/health">Health Check</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border rounded text-sm"
              data-testid="filter-status"
            >
              <option value="all">All Status</option>
              <option value="success">Success (2xx)</option>
              <option value="error">Errors (4xx, 5xx)</option>
            </select>

            <select
              value={filters.method}
              onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
              className="px-3 py-2 border rounded text-sm"
              data-testid="filter-method"
            >
              <option value="all">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
              className="px-3 py-2 border rounded text-sm"
              data-testid="filter-time-range"
            >
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
            </select>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 border rounded text-sm"
                data-testid="sort-by"
              >
                <option value="timestamp">Time</option>
                <option value="duration">Duration</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                data-testid="sort-order"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* API Calls Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCalls.map((call) => (
                  <tr
                    key={call.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedCall?.id === call.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedCall(call)}
                    data-testid={`api-call-row-${call.id}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        call.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        call.method === 'POST' ? 'bg-green-100 text-green-800' :
                        call.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {call.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {call.endpoint}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${getDurationColor(call.duration)}`}>
                      {call.duration}ms
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      ↑{formatBytes(call.requestSize)} ↓{formatBytes(call.responseSize)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sortedCalls.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <p>No API calls match the selected filters</p>
                  <p className="text-sm">Try adjusting the time range or filters</p>
                </div>
              </div>
            )}
          </div>

          {/* Details Panel */}
          {selectedCall && (
            <div className="w-96 bg-gray-50 border-l overflow-y-auto" data-testid="api-call-details">
              <div className="p-4 border-b bg-white">
                <h3 className="font-semibold text-gray-800">Call Details</h3>
                <p className="text-sm text-gray-600">{selectedCall.method} {selectedCall.endpoint}</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${getStatusColor(selectedCall.status).split(' ')[0]}`}>
                        {selectedCall.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className={`font-medium ${getDurationColor(selectedCall.duration)}`}>
                        {selectedCall.duration}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Request Size:</span>
                      <span>{formatBytes(selectedCall.requestSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Size:</span>
                      <span>{formatBytes(selectedCall.responseSize)}</span>
                    </div>
                  </div>
                </div>

                {/* Request Headers */}
                {selectedCall.requestHeaders && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Request Headers</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedCall.requestHeaders, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Request Body */}
                {selectedCall.requestBody && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Request Body</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-40">
                      {JSON.stringify(selectedCall.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Response Body */}
                {selectedCall.responseBody && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Response Body</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-40">
                      {JSON.stringify(selectedCall.responseBody, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error Details */}
                {selectedCall.error && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Error Details</h4>
                    <div className="bg-red-50 border border-red-200 p-2 rounded text-sm text-red-800">
                      {selectedCall.error}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiMonitoringDashboard;