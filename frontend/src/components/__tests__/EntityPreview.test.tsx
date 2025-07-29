import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntityPreview from '../EntityPreview';
import type { ExtractedEntities, ConfidenceScores } from '../../types';

const user = userEvent.setup();

describe('EntityPreview Component', () => {
  const mockEntities: ExtractedEntities = {
    location: "Madrid",
    capacity: 100,
    date: "2024-03-15T10:00:00.000Z",
    eventType: "conference",
    duration: 4,
    budget: {
      min: 1000,
      max: 2000,
      currency: "EUR"
    },
    amenities: ["WiFi", "AV Equipment"]
  };

  const mockConfidence: ConfidenceScores = {
    overall: 0.95,
    location: 0.98,
    date: 0.92,
    capacity: 0.90,
    eventType: 0.88
  };

  test('should display extracted entities', () => {
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    expect(screen.getByText('100 people')).toBeInTheDocument();
    expect(screen.getByText('March 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
  });

  test('should allow editing entities', async () => {
    const mockOnEdit = jest.fn();
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={mockOnEdit} 
      />
    );
    
    const editLocationButton = screen.getByLabelText(/edit location/i);
    await user.click(editLocationButton);
    
    const locationInput = screen.getByDisplayValue('Madrid');
    await user.clear(locationInput);
    await user.type(locationInput, 'Barcelona');
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    expect(mockOnEdit).toHaveBeenCalledWith({
      ...mockEntities,
      location: 'Barcelona'
    });
  });

  test('should show confidence indicator', () => {
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    const confidenceIndicator = screen.getByTestId('confidence-indicator');
    expect(confidenceIndicator).toHaveAttribute('aria-label', '95% confident');
  });

  test('should handle missing entities gracefully', () => {
    const incompleteEntities: ExtractedEntities = { 
      location: "Madrid",
      capacity: null,
      date: null,
      eventType: null,
      duration: null,
      budget: null,
      amenities: []
    };
    
    render(
      <EntityPreview 
        entities={incompleteEntities} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    expect(screen.getByText(/capacity not specified/i)).toBeInTheDocument();
    expect(screen.getByText(/date not specified/i)).toBeInTheDocument();
  });

  test('should show low confidence warning', () => {
    const lowConfidence: ConfidenceScores = {
      overall: 0.45,
      location: 0.50,
      date: 0.40,
      capacity: 0.30,
      eventType: 0.60
    };

    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={lowConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    expect(screen.getByText(/low confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/please review and edit/i)).toBeInTheDocument();
  });

  test('should handle date formatting correctly', () => {
    const entitiesWithDate = {
      ...mockEntities,
      date: "2024-12-25T15:30:00.000Z"
    };

    render(
      <EntityPreview 
        entities={entitiesWithDate} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    expect(screen.getByText('December 25, 2024')).toBeInTheDocument();
  });

  test('should allow editing capacity with validation', async () => {
    const mockOnEdit = jest.fn();
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={mockOnEdit} 
      />
    );
    
    const editCapacityButton = screen.getByLabelText(/edit capacity/i);
    await user.click(editCapacityButton);
    
    const capacityInput = screen.getByDisplayValue('100');
    await user.clear(capacityInput);
    await user.type(capacityInput, '0');
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    // Should show validation error
    expect(screen.getByText(/capacity must be at least 1/i)).toBeInTheDocument();
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  test('should cancel editing when escape key is pressed', async () => {
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    const editLocationButton = screen.getByLabelText(/edit location/i);
    await user.click(editLocationButton);
    
    expect(screen.getByDisplayValue('Madrid')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    
    // Should exit edit mode without calling onEdit
    expect(screen.queryByDisplayValue('Madrid')).not.toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  test('should be accessible with proper ARIA labels', () => {
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    expect(screen.getByRole('region', { name: /extracted entities/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/edit location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/edit capacity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/edit date/i)).toBeInTheDocument();
  });

  test('should display budget information when available', () => {
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    expect(screen.getByText('€1,000 - €2,000')).toBeInTheDocument();
  });

  test('should handle amenities list display', () => {
    render(
      <EntityPreview 
        entities={mockEntities} 
        confidence={mockConfidence}
        onEdit={jest.fn()} 
      />
    );
    
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('AV Equipment')).toBeInTheDocument();
  });
});