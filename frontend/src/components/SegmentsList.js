import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const SegmentsList = ({ segments = [], onCreateSegment, onEditSegment }) => {
  const [localSegments, setLocalSegments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('📋 [SegmentsList] Received segments prop:', segments);

  // Load segments from localStorage on mount
  useEffect(() => {
    try {
      const storedSegments = JSON.parse(localStorage.getItem('segments') || '[]');
      console.log('🔄 [SegmentsList] Loaded segments from localStorage:', storedSegments);
      
      // Combine with any segments passed as props, avoiding duplicates
      const combinedSegments = [...segments];
      
      storedSegments.forEach(storedSegment => {
        if (!combinedSegments.some(s => s.id === storedSegment.id)) {
          combinedSegments.push(storedSegment);
        }
      });
      
      setLocalSegments(combinedSegments);
      console.log('📊 [SegmentsList] Combined segments:', combinedSegments);
    } catch (error) {
      console.error('❌ [SegmentsList] Error loading segments from localStorage:', error);
    }
  }, [segments]); // Re-run when segments prop changes

  // When segments change
  useEffect(() => {
    console.log('📊 [SegmentsList] Local segments updated, length:', localSegments.length);
  }, [localSegments]);

  // When about to render
  const filteredSegments = localSegments.filter(segment => 
    segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    segment.dataset.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log('🔍 [SegmentsList] Filtered segments, length:', filteredSegments.length);
  
  // Just before returning the component
  console.log('🔄 [SegmentsList] About to render table with data');

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRowClick = (segment) => {
    console.log('🖱️ [SegmentsList] Row clicked for segment:', segment);
    console.log('🔍 [SegmentsList] onEditSegment prop exists:', !!onEditSegment);
    
    if (onEditSegment) {
      console.log('📤 [SegmentsList] Calling onEditSegment with segment');
      onEditSegment(segment);
    } else {
      console.warn('⚠️ [SegmentsList] onEditSegment prop is not provided');
    }
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h5" component="h1">
          Segments
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onCreateSegment}
        >
          Add a New Segment
        </Button>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <TextField
          placeholder="Search segments..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearch}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
        >
          Filter
        </Button>
      </Box>
      
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Dataset</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSegments.map((segment) => (
              <TableRow 
                key={segment.id} 
                hover
                onClick={() => handleRowClick(segment)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell component="th" scope="row">
                  {segment.name}
                </TableCell>
                <TableCell>{segment.dataset}</TableCell>
                <TableCell>{formatDate(segment.last_updated)}</TableCell>
                <TableCell>{segment.size.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={segment.status} 
                    size="small"
                    color={segment.status === 'active' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent row click event
                    }}
                  >
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredSegments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No segments found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SegmentsList; 