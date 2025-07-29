import React, { useState, useRef, useEffect } from 'react';
import { 
  PencilSquareIcon, 
  CheckIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  TagIcon,
  ClockIcon,
  CurrencyEuroIcon
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Input from './ui/Input';
import type { ExtractedEntities, ConfidenceScores } from '../types';

interface EntityPreviewProps {
  entities: ExtractedEntities;
  confidence: ConfidenceScores;
  onEdit: (updatedEntities: ExtractedEntities) => void;
  isEditable?: boolean;
}

type EditingField = 'location' | 'capacity' | 'date' | 'eventType' | 'duration' | null;

const EntityPreview: React.FC<EntityPreviewProps> = ({
  entities,
  confidence,
  onEdit,
  isEditable = true,
}) => {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingField]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Date not specified';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatBudget = (budget: ExtractedEntities['budget']): string => {
    if (!budget || (!budget.min && !budget.max)) return 'Budget not specified';
    
    const currency = budget.currency === 'EUR' ? '€' : '$';
    const formatAmount = (amount: number) => amount.toLocaleString();
    
    if (budget.min && budget.max) {
      return `${currency}${formatAmount(budget.min)} - ${currency}${formatAmount(budget.max)}`;
    } else if (budget.min) {
      return `From ${currency}${formatAmount(budget.min)}`;
    } else if (budget.max) {
      return `Up to ${currency}${formatAmount(budget.max)}`;
    }
    
    return 'Budget not specified';
  };

  const handleEdit = (field: EditingField, currentValue: any) => {
    if (!isEditable) return;
    
    setEditingField(field);
    setEditValue(String(currentValue || ''));
    setValidationError(null);
  };

  const handleSave = () => {
    if (!editingField) return;

    // Validation
    if (editingField === 'capacity') {
      const numValue = parseInt(editValue);
      if (isNaN(numValue) || numValue < 1) {
        setValidationError('Capacity must be at least 1');
        return;
      }
    }

    // Update entities
    const updatedEntities: ExtractedEntities = { ...entities };
    
    switch (editingField) {
      case 'location':
        updatedEntities.location = editValue.trim() || null;
        break;
      case 'capacity':
        updatedEntities.capacity = parseInt(editValue) || null;
        break;
      case 'date':
        updatedEntities.date = editValue || null;
        break;
      case 'eventType':
        updatedEntities.eventType = editValue.trim() || null;
        break;
      case 'duration':
        updatedEntities.duration = parseInt(editValue) || null;
        break;
    }

    onEdit(updatedEntities);
    handleCancel();
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
    setValidationError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const EntityField: React.FC<{
    field: EditingField;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: any;
    displayValue: string;
    confidenceScore?: number;
  }> = ({ field, icon: Icon, label, value, displayValue, confidenceScore }) => {
    const isEditing = editingField === field;
    const isLowConfidence = confidenceScore && confidenceScore < 0.7;

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-gray-500" />
          <div>
            <div className="text-sm font-medium text-gray-700">{label}</div>
            {isEditing ? (
              <div className="mt-1">
                <Input
                  ref={inputRef}
                  type={field === 'capacity' || field === 'duration' ? 'number' : 'text'}
                  value={editValue}
                  onChange={setEditValue}
                  onKeyDown={handleKeyDown}
                  error={validationError || undefined}
                  className="text-sm"
                />
                <div className="flex space-x-1 mt-1">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="px-2 py-1"
                  >
                    <CheckIcon className="w-3 h-3" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="px-2 py-1"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${isLowConfidence ? 'text-amber-600' : 'text-gray-900'}`}>
                  {displayValue}
                </span>
                {isLowConfidence && (
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                )}
              </div>
            )}
          </div>
        </div>
        {isEditable && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(field, value)}
            aria-label={`Edit ${label.toLowerCase()}`}
            className="px-2 py-1"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  const isLowConfidenceOverall = confidence.overall < 0.7;

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
      role="region"
      aria-label="Extracted entities from your search"
    >
      {/* Header with confidence indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Extracted Information
        </h3>
        <div 
          className="flex items-center space-x-2"
          data-testid="confidence-indicator"
          aria-label={`${Math.round(confidence.overall * 100)}% confident`}
        >
          <div className="text-sm text-gray-600">
            Confidence: {Math.round(confidence.overall * 100)}%
          </div>
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                confidence.overall >= 0.8 ? 'bg-green-500' : 
                confidence.overall >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${confidence.overall * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Low confidence warning */}
      {isLowConfidenceOverall && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-sm font-medium text-amber-800">Low confidence detected</div>
              <div className="text-sm text-amber-700">Please review and edit the extracted information below.</div>
            </div>
          </div>
        </div>
      )}

      {/* Entity fields */}
      <div className="space-y-3">
        <EntityField
          field="location"
          icon={MapPinIcon}
          label="Location"
          value={entities.location}
          displayValue={entities.location || 'Location not specified'}
          confidenceScore={confidence.location}
        />

        <EntityField
          field="capacity"
          icon={UsersIcon}
          label="Capacity"
          value={entities.capacity}
          displayValue={entities.capacity ? `${entities.capacity} people` : 'Capacity not specified'}
          confidenceScore={confidence.capacity}
        />

        <EntityField
          field="date"
          icon={CalendarIcon}
          label="Date"
          value={entities.date}
          displayValue={formatDate(entities.date)}
          confidenceScore={confidence.date}
        />

        <EntityField
          field="eventType"
          icon={TagIcon}
          label="Event Type"
          value={entities.eventType}
          displayValue={entities.eventType ? entities.eventType.charAt(0).toUpperCase() + entities.eventType.slice(1) : 'Event type not specified'}
          confidenceScore={confidence.eventType}
        />

        {entities.duration && (
          <EntityField
            field="duration"
            icon={ClockIcon}
            label="Duration"
            value={entities.duration}
            displayValue={`${entities.duration} hours`}
          />
        )}

        {entities.budget && (entities.budget.min || entities.budget.max) && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <CurrencyEuroIcon className="w-5 h-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium text-gray-700">Budget</div>
                <div className="text-sm text-gray-900">{formatBudget(entities.budget)}</div>
              </div>
            </div>
          </div>
        )}

        {entities.amenities && entities.amenities.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Required Amenities</div>
            <div className="flex flex-wrap gap-2">
              {entities.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityPreview;