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

const SegmentsList = ({ onCreateSegment }) => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch segments (mock implementation)
  useEffect(() => {
    // In a real implementation, you would fetch segments from your API
    // For now, we'll use the static segments defined above
    console.log('Segments loaded');
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter segments by search term
  const filteredSegments = segments.filter(segment => 
    segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    segment.dataset.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
              <TableRow key={segment.id} hover>
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
                  <IconButton size="small">
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