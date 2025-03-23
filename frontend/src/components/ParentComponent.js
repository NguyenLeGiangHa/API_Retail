import React, { useState } from 'react';
import SegmentsList from './SegmentsList';
import SegmentBuilder from './SegmentBuilder';

const ParentComponent = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'builder'
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [segments, setSegments] = useState([
    {
      id: 'segment:champions',
      name: 'Champions',
      dataset: 'Customer Profile',
      last_updated: '2023-05-15T12:00:00Z',
      size: 1234,
      status: 'active',
      description: 'Customers who are advocates for our brand',
      conditions: [
        {
          id: 1,
          type: 'attribute',
          field: 'lifetime_value',
          operator: 'greater_than',
          value: 1000
        }
      ],
      conditionGroups: [],
      rootOperator: 'AND'
    },
    {
      id: 'segment:loyal-customers',
      name: 'Loyal Customers',
      dataset: 'Customer Profile',
      last_updated: '2023-05-10T09:30:00Z',
      size: 5678,
      status: 'active',
      description: 'Customers who repeatedly purchase from us',
      conditions: [
        {
          id: 1,
          type: 'attribute',
          field: 'purchase_count',
          operator: 'greater_than',
          value: 5
        }
      ],
      conditionGroups: [],
      rootOperator: 'AND'
    },
    {
      id: 'segment:at-risk',
      name: 'At Risk',
      dataset: 'Customer Profile',
      last_updated: '2023-05-05T14:45:00Z',
      size: 432,
      status: 'active',
      description: 'Customers who have not purchased in over 90 days',
      conditions: [
        {
          id: 1,
          type: 'attribute',
          field: 'days_since_last_purchase',
          operator: 'greater_than',
          value: 90
        }
      ],
      conditionGroups: [],
      rootOperator: 'AND'
    }
  ]);

  // Handle switching to segment builder for creating a new segment
  const handleCreateSegment = () => {
    setSelectedSegment(null); // Clear any selected segment
    setCurrentView('builder');
  };

  // Handle switching to segment builder for editing an existing segment
  const handleEditSegment = (segment) => {
    setSelectedSegment(segment);
    setCurrentView('builder');
  };

  // Handle returning to segments list, potentially with a new/updated segment
  const handleBackToList = (updatedSegment = null) => {
    if (updatedSegment) {
      if (selectedSegment) {
        // Update existing segment
        setSegments(prevSegments => 
          prevSegments.map(segment => 
            segment.id === updatedSegment.id ? updatedSegment : segment
          )
        );
      } else {
        // Add the new segment to the list
        setSegments(prevSegments => [updatedSegment, ...prevSegments]);
      }
    }
    setSelectedSegment(null);
    setCurrentView('list');
  };

  return (
    <div>
      {currentView === 'list' ? (
        <SegmentsList 
          segments={segments} 
          onCreateSegment={handleCreateSegment} 
          onEditSegment={handleEditSegment}
        />
      ) : (
        <SegmentBuilder 
          onBack={handleBackToList} 
          editSegment={selectedSegment}
        />
      )}
    </div>
  );
};

export default ParentComponent; 