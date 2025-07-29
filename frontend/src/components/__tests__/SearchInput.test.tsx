import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchInput from '../SearchInput';

// User event setup for v14+
const user = userEvent.setup();

describe('SearchInput Component', () => {
  test('should render input field with placeholder text', () => {
    render(<SearchInput onSearch={jest.fn()} />);
    
    const input = screen.getByPlaceholderText(/describe your venue needs/i);
    expect(input).toBeInTheDocument();
  });

  test('should call onSearch when user submits query', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchInput onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'venue for 100 people in Madrid');
    await user.click(submitButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('venue for 100 people in Madrid');
  });

  test('should show loading state during search', () => {
    render(<SearchInput onSearch={jest.fn()} isLoading={true} />);
    
    const button = screen.getByRole('button', { name: /searching/i });
    expect(button).toBeDisabled();
    expect(screen.getByTestId('search-spinner')).toBeInTheDocument();
  });

  test('should validate minimum query length', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchInput onSearch={mockOnSearch} minLength={10} />);
    
    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'too short');
    await user.click(submitButton);
    
    expect(mockOnSearch).not.toHaveBeenCalled();
    expect(screen.getByText(/please provide more details/i)).toBeInTheDocument();
  });

  test('should support keyboard navigation with Enter key', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchInput onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    
    await user.type(input, 'venue for 100 people');
    await user.keyboard('{Enter}');
    
    expect(mockOnSearch).toHaveBeenCalledWith('venue for 100 people');
  });

  test('should have proper ARIA labels for accessibility', () => {
    render(<SearchInput onSearch={jest.fn()} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Venue search query');
    
    const button = screen.getByRole('button', { name: /search venues/i });
    expect(button).toBeInTheDocument();
  });

  test('should disable submit button when query is empty', () => {
    render(<SearchInput onSearch={jest.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: /search/i });
    expect(submitButton).toBeDisabled();
  });

  test('should clear validation error when user starts typing', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchInput onSearch={mockOnSearch} minLength={10} />);
    
    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    // Trigger validation error
    await user.type(input, 'short');
    await user.click(submitButton);
    
    expect(screen.getByText(/please provide more details/i)).toBeInTheDocument();
    
    // Start typing again
    await user.type(input, ' enough text to pass validation');
    
    await waitFor(() => {
      expect(screen.queryByText(/please provide more details/i)).not.toBeInTheDocument();
    });
  });

  test('should handle custom placeholder text', () => {
    const customPlaceholder = 'Enter your custom venue requirements';
    render(<SearchInput onSearch={jest.fn()} placeholder={customPlaceholder} />);
    
    const input = screen.getByPlaceholderText(customPlaceholder);
    expect(input).toBeInTheDocument();
  });

  test('should auto-focus input when autoFocus prop is true', () => {
    render(<SearchInput onSearch={jest.fn()} autoFocus />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
  });
});