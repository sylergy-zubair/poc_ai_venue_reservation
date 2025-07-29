import React, { useState, useEffect } from 'react';

/**
 * Entity Extraction Debug Panel
 * Phase 4: Debug interface for monitoring and troubleshooting entity extraction
 */

interface DebugData {
  rawQuery: string;
  claudeResponse: any;
  extractedEntities: any;
  confidence: {
    overall: number;
    location?: number;
    capacity?: number;
    date?: number;
    eventType?: number;
  };
  processingTime: number;
  timestamp: string;
  errors?: string[];
}

interface EntityExtractionDebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  debugData?: DebugData | null;
}

const EntityExtractionDebugPanel: React.FC<EntityExtractionDebugPanelProps> = ({
  isVisible,
  onToggle,
  debugData
}) => {
  const [activeTab, setActiveTab] = useState<'entities' | 'raw' | 'confidence' | 'performance'>('entities');
  const [debugHistory, setDebugHistory] = useState<DebugData[]>([]);

  useEffect(() => {
    if (debugData) {
      setDebugHistory(prev => [debugData, ...prev.slice(0, 9)]); // Keep last 10 entries
    }
  }, [debugData]);

  const formatJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceColor = (time: number) => {
    if (time < 1000) return 'text-green-600';
    if (time < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700 z-50"
        data-testid="debug-panel-toggle"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="debug-panel-overlay">
      <div className="bg-white rounded-lg shadow-xl w-5/6 h-5/6 max-w-6xl max-h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Entity Extraction Debug Panel</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm opacity-75">
              Last Update: {debugData?.timestamp ? new Date(debugData.timestamp).toLocaleTimeString() : 'N/A'}
            </span>
            <button
              onClick={onToggle}
              className="text-white hover:text-gray-300"
              data-testid="debug-panel-close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-100 px-6 py-2 flex space-x-4 border-b">
          {[
            { key: 'entities', label: 'Extracted Entities' },
            { key: 'raw', label: 'Raw Response' },
            { key: 'confidence', label: 'Confidence Scores' },
            { key: 'performance', label: 'Performance' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded text-sm font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              data-testid={`debug-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!debugData ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <p>No debug data available</p>
                  <p className="text-sm">Perform a search to see entity extraction debug information</p>
                </div>
              </div>
            ) : (
              <>
                {/* Query Display */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Original Query</h3>
                  <p className="text-gray-700 italic" data-testid="debug-original-query">
                    "{debugData.rawQuery}"
                  </p>
                </div>

                {/* Tab Content */}
                {activeTab === 'entities' && (
                  <div className="space-y-4" data-testid="debug-entities-tab">
                    <h3 className="text-lg font-semibold text-gray-800">Extracted Entities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(debugData.extractedEntities || {}).map(([key, value]) => (
                        <div key={key} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-800 capitalize">{key}</h4>
                            {debugData.confidence[key as keyof typeof debugData.confidence] && (
                              <span className={`text-sm font-medium ${getConfidenceColor(debugData.confidence[key as keyof typeof debugData.confidence]!)}`}>
                                {(debugData.confidence[key as keyof typeof debugData.confidence]! * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700" data-testid={`debug-entity-${key}`}>
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'raw' && (
                  <div className="space-y-4" data-testid="debug-raw-tab">
                    <h3 className="text-lg font-semibold text-gray-800">Raw Claude Response</h3>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                      <code data-testid="debug-raw-response">
                        {formatJson(debugData.claudeResponse)}
                      </code>
                    </pre>
                  </div>
                )}

                {activeTab === 'confidence' && (
                  <div className="space-y-4" data-testid="debug-confidence-tab">
                    <h3 className="text-lg font-semibold text-gray-800">Confidence Scores</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="font-medium">Overall Confidence</span>
                        <span className={`font-bold ${getConfidenceColor(debugData.confidence.overall)}`}>
                          {(debugData.confidence.overall * 100).toFixed(1)}%
                        </span>
                      </div>
                      {Object.entries(debugData.confidence)
                        .filter(([key]) => key !== 'overall')
                        .map(([entity, confidence]) => (
                          <div key={entity} className="flex items-center justify-between p-3 border rounded">
                            <span className="capitalize">{entity}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    confidence! >= 0.9 ? 'bg-green-500' :
                                    confidence! >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${confidence! * 100}%` }}
                                />
                              </div>
                              <span className={`font-medium ${getConfidenceColor(confidence!)}`}>
                                {(confidence! * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {activeTab === 'performance' && (
                  <div className="space-y-4" data-testid="debug-performance-tab">
                    <h3 className="text-lg font-semibold text-gray-800">Performance Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-800">{debugData.processingTime}ms</div>
                        <div className="text-sm text-gray-600">Processing Time</div>
                        <div className={`text-xs mt-1 ${getPerformanceColor(debugData.processingTime)}`}>
                          {debugData.processingTime < 1000 ? 'Excellent' :
                           debugData.processingTime < 2000 ? 'Good' : 'Needs Optimization'}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {Object.keys(debugData.extractedEntities || {}).length}
                        </div>
                        <div className="text-sm text-gray-600">Entities Found</div>
                      </div>
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {debugData.errors?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">Errors</div>
                        {debugData.errors && debugData.errors.length > 0 && (
                          <div className="text-xs text-red-600 mt-1">Issues Detected</div>
                        )}
                      </div>
                    </div>

                    {debugData.errors && debugData.errors.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-red-800 mb-2">Errors & Warnings</h4>
                        <div className="space-y-2">
                          {debugData.errors.map((error, index) => (
                            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Debug History Sidebar */}
          <div className="w-64 bg-gray-50 p-4 border-l overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-4">Debug History</h3>
            <div className="space-y-2">
              {debugHistory.map((entry, index) => (
                <div
                  key={index}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    entry === debugData ? 'bg-blue-100 border border-blue-300' : 'bg-white hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    // In a real implementation, this would update the displayed debug data
                    console.log('Selected debug entry:', entry);
                  }}
                  data-testid={`debug-history-${index}`}
                >
                  <div className="text-xs text-gray-600">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {entry.rawQuery}
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{Object.keys(entry.extractedEntities || {}).length} entities</span>
                    <span className={getPerformanceColor(entry.processingTime)}>
                      {entry.processingTime}ms
                    </span>
                  </div>
                </div>
              ))}
              {debugHistory.length === 0 && (
                <div className="text-center text-gray-500 text-sm">
                  No history available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityExtractionDebugPanel;