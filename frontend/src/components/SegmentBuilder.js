import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Grid,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CodeIcon from '@mui/icons-material/Code';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const SegmentBuilder = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [segmentName, setSegmentName] = useState('High Value Users (new)');
  const [segmentId, setSegmentId] = useState(`segment:high-value-users-new`);
  const [selectedDataset, setSelectedDataset] = useState('Users');
  const [datasets, setDatasets] = useState({
    'Users': { name: 'Users', description: 'User information' },
    'Customer Profile': { name: 'customers', description: 'Customer information' },
    'Transactions': { name: 'transactions', description: 'Transaction records' },
    'Stores': { name: 'stores', description: 'Store information' },
    'Product Line': { name: 'product_lines', description: 'Product information' }
  });
  const [description, setDescription] = useState('');
  const [showDescriptionField, setShowDescriptionField] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState({ count: 88, percentage: 22 });
  const [attributes, setAttributes] = useState([
    { name: 'id', type: 'number' },
    { name: 'first_name', type: 'text' },
    { name: 'last_name', type: 'text' },
    { name: 'email', type: 'text' },
    { name: 'created_at', type: 'datetime' },
    { name: 'updated_at', type: 'datetime' },
    { name: 'team_id', type: 'number' },
    { name: 'version_number', type: 'text' },
    { name: 'team_domain', type: 'text' }
  ]);
  const [loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);

  // Tab labels
  const tabs = ["Definition", "Activity", "Syncs", "Overlap"];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSaveSegment = () => {
    toast.success(`Segment "${segmentName}" created successfully`);
    onBack();
  };

  // Add this useEffect to fetch table data on component mount
  useEffect(() => {
    fetchDatasets();
  }, []);

  // Update the effect that watches for dataset changes
  useEffect(() => {
    if (selectedDataset) {
      fetchAttributes(selectedDataset);
    }
  }, [selectedDataset]);

  // Add useEffect to update segmentId when segmentName changes
  useEffect(() => {
    // Create a slugified version of the segmentName
    const slug = segmentName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
    
    setSegmentId(`segment:${slug}`);
  }, [segmentName]);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/tables`);
      setDatasets(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      toast.error('Failed to load datasets');
      setLoading(false);
    }
  };

  const fetchAttributes = async (datasetName) => {
    try {
      setLoading(true);
      
      // Get the table info from the datasets state
      const tableInfo = datasets[datasetName];
      
      if (!tableInfo) {
        toast.error(`Table information for ${datasetName} not found`);
        setLoading(false);
        return;
      }
      
      // If the table has fields, use them directly
      if (tableInfo.fields && Array.isArray(tableInfo.fields)) {
        const formattedAttributes = tableInfo.fields.map(field => ({
          name: field,
          type: determineFieldType(field)
        }));
        
        setAttributes(formattedAttributes);
        console.log(`Loaded ${formattedAttributes.length} attributes for ${datasetName}`);
      } else {
        // If fields aren't available in the state, fetch them from the API
        console.log(`Fetching fields for table: ${tableInfo.name}`);
        try {
          // Make a request to the API to get table schema
          // In a real app, you'd have an endpoint like /api/table-schema/{tableName}
          // For now, we'll simulate a successful response with the default fields
          const defaultFields = getDefaultFieldsForTable(tableInfo.name);
          
          const formattedAttributes = defaultFields.map(field => ({
            name: field,
            type: determineFieldType(field)
          }));
          
          setAttributes(formattedAttributes);
          console.log(`Loaded ${formattedAttributes.length} default attributes for ${datasetName}`);
        } catch (error) {
          console.error('Error fetching table schema:', error);
          toast.error(`Failed to load fields for ${datasetName}`);
          setAttributes([]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      toast.error(`Failed to load attributes for ${datasetName}`);
      setLoading(false);
      setAttributes([]);
    }
  };

  // Helper function to determine field type based on field name
  const determineFieldType = (fieldName) => {
    const lowerField = fieldName.toLowerCase();
    
    if (lowerField.includes('date') || lowerField.includes('time') || lowerField.includes('_at')) {
      return 'datetime';
    } else if (
      lowerField.includes('id') || 
      lowerField.includes('amount') || 
      lowerField.includes('price') || 
      lowerField.includes('cost') || 
      lowerField.includes('quantity') || 
      lowerField.includes('number')
    ) {
      return 'number';
    } else {
      return 'text';
    }
  };
  
  // Helper function to get default fields for each table
  const getDefaultFieldsForTable = (tableName) => {
    switch (tableName.toLowerCase()) {
      case 'customers':
        return [
          'customer_id', 
          'first_name', 
          'last_name', 
          'email',
          'phone',
          'gender',
          'birth_date',
          'registration_date',
          'address',
          'city'
        ];
      case 'transactions':
        return [
          'transaction_id', 
          'customer_id', 
          'store_id',
          'transaction_date',
          'total_amount',
          'payment_method',
          'product_line_id',
          'quantity',
          'unit_price'
        ];
      case 'stores':
        return [
          'store_id',
          'store_name',
          'address',
          'city',
          'store_type',
          'opening_date',
          'region'
        ];
      case 'product_lines':
        return [
          'product_line_id',
          'name',
          'category',
          'subcategory',
          'brand',
          'unit_cost'
        ];
      case 'users':
        return [
          'id',
          'first_name',
          'last_name',
          'email',
          'created_at',
          'updated_at',
          'team_id',
          'version_number',
          'team_domain'
        ];
      default:
        return ['id', 'name', 'created_at'];
    }
  };

  // Update the handle dataset change function
  const handleDatasetChange = (e) => {
    const newDataset = e.target.value;
    setSelectedDataset(newDataset);
    // fetchAttributes is now called by the useEffect
  };

  // Function to handle copying to clipboard
  const handleCopySegmentId = () => {
    navigator.clipboard.writeText(segmentId)
      .then(() => {
        setCopySuccess(true);
        toast.success('Segment ID copied to clipboard');
        
        // Reset the copy success icon after 2 seconds
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 1,
        pb: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
          <FilterListIcon sx={{ color: 'primary.main', mx: 1 }} />
          <TextField
            variant="standard"
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            sx={{ 
              '& .MuiInputBase-input': { 
                fontSize: '1.25rem', 
                fontWeight: 400,
                width: '260px'
              },
              '& .MuiInput-underline:before': { borderBottom: 'none' },
              '& .MuiInput-underline:hover:before': { borderBottom: '1px solid rgba(0, 0, 0, 0.42)' }
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            sx={{ mx: 0.5 }}
          >
            View SQL
          </Button>
          <Button 
            variant="outlined" 
            sx={{ mx: 0.5 }}
          >
            Preview Results
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            sx={{ mx: 0.5 }}
          >
            Discard Changes
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSegment}
            sx={{ mx: 0.5 }}
          >
            Save Segment
          </Button>
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab} sx={{ textTransform: 'none' }} />
          ))}
        </Tabs>
      </Box>

      {/* Main content area */}
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {/* Left column with form inputs */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="body1" fontWeight={500} gutterBottom>
                  Segment Name
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  size="small"
                  sx={{ mb: 3 }}
                />

                <Typography variant="body1" fontWeight={500} gutterBottom>
                  Segment Resource ID
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={segmentId}
                  // Read-only field - generated automatically
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={handleCopySegmentId}
                          color={copySuccess ? "success" : "default"}
                          sx={{ transition: 'all 0.2s' }}
                        >
                          {copySuccess ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { 
                      bgcolor: '#f9f9f9',
                      '&.Mui-focused': { bgcolor: '#f9f9f9' },
                      cursor: 'default'
                    }
                  }}
                  size="small"
                  sx={{ mb: 3 }}
                />

                <Typography variant="body1" fontWeight={500} gutterBottom>
                  Segment of
                </Typography>
                <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                  <Select
                    value={selectedDataset}
                    onChange={handleDatasetChange}
                    displayEmpty
                    sx={{ 
                      '& .MuiSelect-select': { 
                        display: 'flex', 
                        alignItems: 'center',
                        pb: 1.2,
                        pt: 1.2
                      } 
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box component="span" sx={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          bgcolor: '#f0f0f0',
                          borderRadius: '4px',
                          mr: 1.5,
                          color: '#666'
                        }}>
                          <span>{selected.charAt(0)}</span>
                        </Box>
                        {selected}
                      </Box>
                    )}
                  >
                    {Object.entries(datasets).map(([name, info]) => (
                      <MenuItem key={name} value={name}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box component="span" sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            bgcolor: '#f0f0f0',
                            borderRadius: '4px',
                            mr: 1.5,
                            color: '#666'
                          }}>
                            <span>{name.charAt(0)}</span>
                          </Box>
                          {name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body1" fontWeight={500} gutterBottom>
                  Description
                </Typography>
                {showDescriptionField ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Enter description..."
                    variant="outlined"
                    size="small"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                ) : (
                  <Button 
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setShowDescriptionField(true)}
                    size="small"
                    sx={{ 
                      textTransform: 'none', 
                      borderColor: '#ddd',
                      color: '#666'
                    }}
                  >
                    Add Description
                  </Button>
                )}
              </Box>

              {/* Condition builder area */}
              <Box
                sx={{
                  borderLeft: '4px solid #3f51b5',
                  pl: 3,
                  ml: 2
                }}
              >
                <Box sx={{ 
                  bgcolor: '#f5f8ff', 
                  border: '1px solid #e0e6f5',
                  borderRadius: 1,
                  p: 2,
                  mb: 3
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Performed
                    </Typography>
                    <Box sx={{ ml: 2, flexGrow: 1 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          value="App Events"
                          displayEmpty
                          sx={{ '& .MuiSelect-select': { py: 1 } }}
                        >
                          <MenuItem value="App Events">App Events</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <IconButton size="small">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, width: '80px' }}>
                      with
                    </Typography>
                    <FormControl size="small" sx={{ width: '200px', mr: 2 }}>
                      <Select
                        value="Event named"
                        displayEmpty
                        sx={{ '& .MuiSelect-select': { py: 1 } }}
                      >
                        <MenuItem value="Event named">Event named</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField 
                      placeholder="New Canvas" 
                      variant="outlined" 
                      size="small" 
                      sx={{ flexGrow: 1 }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, width: '80px' }}>
                      occurring
                    </Typography>
                    <FormControl size="small" sx={{ width: '120px', mr: 2 }}>
                      <Select
                        value="at least"
                        displayEmpty
                        sx={{ '& .MuiSelect-select': { py: 1 } }}
                      >
                        <MenuItem value="at least">at least</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField 
                      value="3" 
                      variant="outlined" 
                      size="small" 
                      sx={{ width: '80px', mr: 2 }}
                    />
                    <Typography variant="body2" sx={{ mr: 2 }}>
                      times
                    </Typography>
                    <FormControl size="small" sx={{ width: '120px', mr: 2 }}>
                      <Select
                        value="within last"
                        displayEmpty
                        sx={{ '& .MuiSelect-select': { py: 1 } }}
                      >
                        <MenuItem value="within last">within last</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField 
                      value="90" 
                      variant="outlined" 
                      size="small" 
                      sx={{ width: '80px', mr: 2 }}
                    />
                    <Typography variant="body2">
                      days
                    </Typography>
                  </Box>
                </Box>

                {/* Email condition */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  mb: 2
                }}>
                  <Box sx={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <Box component="span" sx={{ 
                      color: '#666', 
                      display: 'flex',
                      alignItems: 'center',
                      mr: 1.5 
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>T</Typography>
                    </Box>
                    <Typography sx={{ flexGrow: 1 }}>
                      email
                    </Typography>
                    <FormControl size="small" sx={{ width: '220px' }}>
                      <Select
                        value="is not blank"
                        displayEmpty
                        sx={{ '& .MuiSelect-select': { py: 1 } }}
                      >
                        <MenuItem value="is not blank">is not blank</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Add buttons */}
                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Add condition
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Add condition group
                  </Button>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              {/* Right column with estimated size and details list */}
              <Paper 
                elevation={0} 
                variant="outlined"
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 2,
                  border: '1px solid #e6e6e6'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    ESTIMATED SIZE
                    <Box component="span" sx={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      bgcolor: '#e0e0e0',
                      fontSize: '11px',
                      ml: 0.5
                    }}>
                      i
                    </Box>
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 1 }}>
                  <Typography variant="h4" component="div" sx={{ mb: 0 }}>
                    {estimatedSize.count}
                  </Typography>
                  <Typography variant="body1" component="div" color="text.secondary">
                    {estimatedSize.percentage}%
                  </Typography>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mt: 1,
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', height: 6, borderRadius: 3 }}>
                    <Box sx={{ 
                      width: `${estimatedSize.percentage}%`, 
                      height: '100%', 
                      bgcolor: '#f77', 
                      borderRadius: 3 
                    }} />
                  </Box>
                  <Typography variant="body2" sx={{ ml: 2, color: '#f77' }}>
                    -54%
                  </Typography>
                </Box>
              </Paper>

              {/* Details list - show loading state when fetching attributes */}
              <Paper 
                elevation={0} 
                variant="outlined"
                sx={{ 
                  borderRadius: 2,
                  border: '1px solid #e6e6e6',
                  position: 'relative'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  px: 2.5,
                  py: 2
                }}>
                  <Typography variant="subtitle1">
                    Details List
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => fetchAttributes(selectedDataset)}
                    disabled={loading}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Box>

                {loading && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      Loading attributes...
                    </Typography>
                  </Box>
                )}

                <Box sx={{ px: 2.5, pb: 2 }}>
                  <Box sx={{ 
                    borderRadius: 1,
                    border: '1px solid #e6e6e6',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      p: 2,
                      bgcolor: '#f8f9fa',
                      borderBottom: '1px solid #e6e6e6'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Box component="span" sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#e4e4e4',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#666',
                          width: 20,
                          height: 20,
                          borderRadius: 0.5,
                          mr: 1
                        }}>
                          {selectedDataset ? selectedDataset.charAt(0) : 'U'}
                        </Box>
                        <Typography variant="subtitle2" sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%'
                        }}>
                          {selectedDataset} Attributes
                          <Box component="span" sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#e4e4e4',
                            fontSize: '11px',
                            color: '#666',
                            width: 20,
                            height: 20,
                            borderRadius: 1
                          }}>
                            {attributes.length}
                          </Box>
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        A condition on an attribute of {selectedDataset}
                      </Typography>
                    </Box>

                    <Box sx={{
                      maxHeight: '350px',
                      overflowY: 'auto'
                    }}>
                      {loading ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Loading attributes...
                          </Typography>
                        </Box>
                      ) : attributes.length > 0 ? (
                        <>
                          {attributes.map((attr, index) => (
                            <Box 
                              key={index}
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                p: 1.5,
                                borderBottom: index < attributes.length - 1 ? '1px solid #f0f0f0' : 'none',
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: '#f8f9fa'
                                }
                              }}
                              onClick={() => {
                                // Add this attribute as a new condition
                                console.log(`Adding condition for: ${attr.name}`);
                                // Implementation for adding condition would go here
                              }}
                            >
                              <Box component="span" sx={{ width: 20, mr: 1, color: '#999', fontSize: '0.85rem' }}>
                                {attr.type === 'number' ? '#' : 
                                 attr.type === 'datetime' ? '⏱' : 'T'}
                              </Box>
                              <Typography variant="body2">
                                {attr.name}
                              </Typography>
                            </Box>
                          ))}

                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              p: 1.5,
                              borderTop: '1px solid #f0f0f0',
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: '#f8f9fa'
                              }
                            }}
                          >
                            <Box component="span" sx={{ 
                              width: 20, 
                              mr: 1, 
                              color: '#999',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <CodeIcon fontSize="small" />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              SQL Condition
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No attributes available for this table
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Other tabs content */}
      {activeTab === 1 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Activity Tab Content</Typography>
          <Typography variant="body1">This tab shows activity information.</Typography>
        </Box>
      )}
      
      {activeTab === 2 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Syncs Tab Content</Typography>
          <Typography variant="body1">This tab shows sync information.</Typography>
        </Box>
      )}
      
      {activeTab === 3 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Overlap Tab Content</Typography>
          <Typography variant="body1">This tab shows overlap information.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default SegmentBuilder; 