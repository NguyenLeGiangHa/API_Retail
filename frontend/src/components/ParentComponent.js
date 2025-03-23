import React, { useState } from 'react';
import SegmentsList from './SegmentsList';
import SegmentBuilder from './SegmentBuilder';

const ParentComponent = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'builder'
  const [segments, setSegments] = useState([
    {
      id: 'segment:champions',
      name: 'Champions',
      dataset: 'Customer Profile',
      last_updated: '2023-05-15T12:00:00Z',
      size: 1234,
      status: 'active'
    },
    {
      id: 'segment:loyal-customers',
      name: 'Loyal Customers',
      dataset: 'Customer Profile',
      last_updated: '2023-05-10T09:30:00Z',
      size: 5678,
      status: 'active'
    },
    {
      id: 'segment:at-risk',
      name: 'At Risk',
      dataset: 'Customer Profile',
      last_updated: '2023-05-05T14:45:00Z',
      size: 432,
      status: 'active'
    }
  ]);

  // Handle switching to segment builder
  const handleCreateSegment = () => {
    setCurrentView('builder');
  };

  // Handle returning to segments list, potentially with a new segment
  const handleBackToList = (newSegment = null) => {
    if (newSegment) {
      // Add the new segment to the list
      setSegments(prevSegments => [newSegment, ...prevSegments]);
    }
    setCurrentView('list');
  };

  return (
    <div>
      {currentView === 'list' ? (
        <SegmentsList 
          segments={segments} 
          onCreateSegment={handleCreateSegment} 
        />
      ) : (
        <SegmentBuilder onBack={handleBackToList} />
      )}
    </div>
  );
};

export default ParentComponent; 