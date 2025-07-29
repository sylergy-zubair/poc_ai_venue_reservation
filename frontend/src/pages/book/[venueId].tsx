import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ApiService from '../../services/api';
import type { BookingRequest } from '../../types';

const BookingPage: React.FC = () => {
  const router = useRouter();
  const { venueId } = router.query;
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    eventName: '',
    eventDescription: '',
    date: '',
    startTime: '',
    endTime: '',
    attendeeCount: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueId) return;

    setIsSubmitting(true);
    try {
      const booking: BookingRequest = {
        contact: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
        },
        details: {
          venueId: venueId as string,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          attendeeCount: parseInt(formData.attendeeCount),
          eventType: 'conference',
          eventName: formData.eventName,
          eventDescription: formData.eventDescription,
        }
      };

      await ApiService.createBooking(booking);
      alert('Booking request submitted successfully!');
      router.push('/');
      
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Book Venue">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Book This Venue</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(value) => handleInputChange('firstName', value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(value) => handleInputChange('lastName', value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Company (Optional)</label>
            <Input
              value={formData.company}
              onChange={(value) => handleInputChange('company', value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Event Name</label>
            <Input
              value={formData.eventName}
              onChange={(value) => handleInputChange('eventName', value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Event Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              value={formData.eventDescription}
              onChange={(e) => handleInputChange('eventDescription', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(value) => handleInputChange('date', value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(value) => handleInputChange('startTime', value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(value) => handleInputChange('endTime', value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Number of Attendees</label>
            <Input
              type="number"
              value={formData.attendeeCount}
              onChange={(value) => handleInputChange('attendeeCount', value)}
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              className="flex-1"
            >
              Submit Booking Request
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default BookingPage;