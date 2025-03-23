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
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Switch,
  FormGroup,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RefreshIcon from '@mui/icons-material/Refresh';
import CodeIcon from '@mui/icons-material/Code';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TuneIcon from '@mui/icons-material/Tune';
import EventIcon from '@mui/icons-material/Event';
import LinkIcon from '@mui/icons-material/Link';
import GroupIcon from '@mui/icons-material/Group';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Condition operators by data type
const OPERATORS = {
  text: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_null', label: 'is blank' },
    { value: 'is_not_null', label: 'is not blank' }
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'greater_than', label: 'more than' },
    { value: 'less_than', label: 'less than' },
    { value: 'between', label: 'between' },
    { value: 'is_null', label: 'is blank' },
    { value: 'is_not_null', label: 'is not blank' }
  ],
  datetime: [
    { value: 'after', label: 'after' },
    { value: 'before', label: 'before' },
    { value: 'on', label: 'on' },
    { value: 'not_on', label: 'not on' },
    { value: 'between', label: 'between' },
    { value: 'relative_days_ago', label: 'in the last...' },
    { value: 'is_null', label: 'is blank' },
    { value: 'is_not_null', label: 'is not blank' }
  ],
  boolean: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' }
  ],
  array: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'contains_all', label: 'contains all of' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' }
  ]
};

// Event condition types
const EVENT_CONDITION_TYPES = [
  { value: 'performed', label: 'Performed' },
  { value: 'not_performed', label: 'Not Performed' },
  { value: 'first_time', label: 'First Time' },
  { value: 'last_time', label: 'Last Time' }
];

// Frequency options for event conditions
const FREQUENCY_OPTIONS = [
  { value: 'at_least', label: 'at least' },
  { value: 'at_most', label: 'at most' },
  { value: 'exactly', label: 'exactly' }
];

// Time period options for event conditions
const TIME_PERIOD_OPTIONS = [
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
  { value: 'months', label: 'months' }
];

const SegmentBuilder = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [segmentName, setSegmentName] = useState('High Value Users (new)');
  const [segmentId, setSegmentId] = useState(`segment:high-value-users-new`);
  const [selectedDataset, setSelectedDataset] = useState('Customer Profile');
  const [datasets, setDatasets] = useState({
    'Customer Profile': { name: 'customers', description: 'Customer information', fields: [] },
    'Transactions': { name: 'transactions', description: 'Transaction records', fields: [] },
    'Stores': { name: 'stores', description: 'Store information', fields: [] },
    'Product Line': { name: 'product_lines', description: 'Product information', fields: [] },
    'Events': { name: 'events', description: 'User event data', fields: [] }
  });
  const [relatedDatasets, setRelatedDatasets] = useState({
    'Customer Profile': ['Transactions', 'Events'],
    'Transactions': ['Customer Profile', 'Stores', 'Product Line'],
    'Stores': ['Transactions'],
    'Product Line': ['Transactions']
  });
  const [description, setDescription] = useState('');
  const [showDescriptionField, setShowDescriptionField] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState({ count: 88, percentage: 22 });
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  
  
  // Conditions state
  const [rootOperator, setRootOperator] = useState('AND');
  const [conditions, setConditions] = useState([
    {
      id: 1,
      type: 'attribute',
      field: 'email',
      operator: 'is_not_null',
      value: null
    }
  ]);
  const [conditionGroups, setConditionGroups] = useState([
    {
      id: 2,
      type: 'group',
      operator: 'AND',
      conditions: [
        {
          id: 3,
          type: 'event',
          eventType: 'performed',
          eventName: 'New Canvas',
          frequency: 'at_least',
          count: 3,
          timePeriod: 'days',
          timeValue: 90
        }
      ]
    }
  ]);
  
  // Related segments for inclusions/exclusions
  const [availableSegments, setAvailableSegments] = useState([
    { id: 'segment:recent-customers', name: 'Recent Customers', count: 456 },
    { id: 'segment:vip-users', name: 'VIP Users', count: 123 },
    { id: 'segment:high-spenders', name: 'High Spenders', count: 78 }
  ]);
  
  // Inclusion/Exclusion state
  const [inclusions, setInclusions] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  
  // Dialog states
  const [segmentSelectorOpen, setSegmentSelectorOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState('include'); // 'include' or 'exclude'
  
  // Tab labels
  const tabs = ["Definition", "Activity", "Syncs", "Overlap"];

  // New states for preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // useEffect to fetch initial data
  useEffect(() => {
    fetchDatasets();
    fetchAvailableSegments();
  }, []);

  // useEffect to update segmentId when segmentName changes
  useEffect(() => {
    const slug = segmentName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    setSegmentId(`segment:${slug}`);
  }, [segmentName]);

  // useEffect to fetch attributes when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      fetchAttributes(selectedDataset);
    }
  }, [selectedDataset]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      
      // Get the connection URL from environment variables or localStorage
      const connectionUrl = process.env.REACT_APP_CONNECTION_URL || process.env.SEGMENTATION_URL || localStorage.getItem('postgres_connection');

      if (!connectionUrl) {
        toast.error("Connection URL not configured. Please set the connection URL in your settings or environment variables.");
      setLoading(false);
        return;
      }
      
      // Store in localStorage for consistency with other parts of the application
      localStorage.setItem('postgres_connection', connectionUrl);
      
      console.log("Attempting to fetch tables from PostgreSQL database");
      
      try {
        // Fetch all tables and their columns from the database
        const response = await axios.get(`${API_BASE_URL}/api/datasources/postgres/tables`, {
          params: { connection_url: connectionUrl }
        });
        
        if (response.data && Array.isArray(response.data)) {
          // Transform the response data to match our expected structure
          const targetTables = ['customers', 'transactions', 'stores', 'product_lines'];
          const formattedDatasets = {};
          
          // Filter and process only the target tables
          response.data.forEach(table => {
            const tableName = table.table_name.toLowerCase();
            if (targetTables.includes(tableName)) {
              // Create a readable display name (capitalize first letter)
              const displayName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
              
              formattedDatasets[displayName] = { 
                name: tableName, 
                description: table.description || `${displayName} information`,
                schema: table.schema_name || 'public',
                fields: table.columns || []
              };
            }
          });
          
          if (Object.keys(formattedDatasets).length === 0) {
            toast.warning('No matching tables found in the database. Make sure your connection has proper permissions and the tables exist.');
          } else {
            setDatasets(formattedDatasets);
            
            // Set the first table as selected if we have results and no selection yet
            if (Object.keys(formattedDatasets).length > 0 && (!selectedDataset || !formattedDatasets[selectedDataset])) {
              setSelectedDataset(Object.keys(formattedDatasets)[0]);
            }
            
            toast.success(`Successfully loaded ${Object.keys(formattedDatasets).length} tables from PostgreSQL`);
          }
        } else {
          toast.error('API response format not as expected. Please check the server logs for details.');
          console.warn('API response format not as expected:', response.data);
        }
    } catch (error) {
        console.error('Error fetching PostgreSQL tables:', error);
        let errorMessage = 'Failed to load tables from PostgreSQL database';
        
        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
          
          // Check for common connection errors and provide more helpful messages
          if (errorMessage.includes('No such host') || errorMessage.includes('Could not resolve hostname')) {
            errorMessage = 'Could not connect to the database server. Please verify the hostname in your connection URL.';
          } else if (errorMessage.includes('Connection refused')) {
            errorMessage = 'Connection refused. Please verify the port in your connection URL.';
          } else if (errorMessage.includes('password authentication failed')) {
            errorMessage = 'Login failed. Please check your username and password in the connection URL.';
          }
        }
        
        toast.error(errorMessage);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred while fetching data');
      setLoading(false);
    }
  };

  const fetchAvailableSegments = async () => {
    try {
      // In a real app, you would fetch from API
      // For now, we'll use the static data defined above
      console.log('Loaded available segments for inclusion/exclusion');
    } catch (error) {
      console.error('Error fetching segments:', error);
    }
  };

  const fetchAttributes = async (datasetName) => {
    try {
      setLoading(true);
      
      const tableInfo = datasets[datasetName];
      
      if (!tableInfo) {
        toast.error(`Table information for ${datasetName} not found`);
        setLoading(false);
        return;
      }
      
      // If we already have fields from the initial fetch, use those
      if (tableInfo.fields && Array.isArray(tableInfo.fields) && tableInfo.fields.length > 0) {
        const formattedAttributes = tableInfo.fields.map(field => ({
          name: field,
          type: determineFieldType(field)
        }));
        
        setAttributes(formattedAttributes);
        setLoading(false);
        return;
      }
      
      // If no fields, set empty attributes
      setAttributes([]);
      toast.warning(`No fields available for ${datasetName}. Try refreshing the data.`);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchAttributes:', error);
      toast.error(`Failed to load attributes for ${datasetName}`);
      setLoading(false);
      setAttributes([]);
    }
  };

  // Improved determineFieldType function that can use PostgreSQL data type information
  const determineFieldType = (fieldName, dataType = null) => {
    // If we have the actual data type from PostgreSQL, use it
    if (dataType) {
      // Convert PostgreSQL data types to our field types
      if (dataType.includes('timestamp') || dataType.includes('date') || dataType.includes('time')) {
        return 'datetime';
      } else if (dataType.includes('int') || dataType.includes('float') || dataType.includes('numeric') || dataType.includes('decimal') || dataType.includes('double')) {
        return 'number';
      } else if (dataType === 'boolean') {
        return 'boolean';
      } else if (dataType.includes('array') || dataType.includes('json') || dataType.includes('jsonb')) {
        return 'array';
      } else {
        return 'text';
      }
    }
    
    // Fallback to field name heuristics
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
    } else if (lowerField.includes('is_') || lowerField.includes('has_')) {
      return 'boolean';
    } else if (lowerField.includes('tags') || lowerField.includes('categories') || lowerField.includes('array')) {
      return 'array';
    } else {
      return 'text';
    }
  };

  const handleDatasetChange = (e) => {
    const newDataset = e.target.value;
    setSelectedDataset(newDataset);
  };

  const handleCopySegmentId = () => {
    navigator.clipboard.writeText(segmentId)
      .then(() => {
        setCopySuccess(true);
        toast.success('Segment ID copied to clipboard');
        
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  const handleSaveSegment = () => {
    if (!segmentName.trim()) {
      toast.error('Please enter a segment name');
      return;
    }

    const segmentData = {
      id: segmentId,
      name: segmentName,
      description: description || null,
      dataset: selectedDataset,
      root_operator: rootOperator,
      conditions: [...conditions, ...conditionGroups],
      inclusions: inclusions,
      exclusions: exclusions,
      estimated_size: estimatedSize
    };

    // In a real app, you would post to API
    console.log('Saving segment data:', segmentData);

    toast.success(`Segment "${segmentName}" created successfully`);
    onBack();
  };

  // Function to handle root operator change (AND/OR)
  const handleRootOperatorChange = (event, newValue) => {
    if (newValue !== null) {
      setRootOperator(newValue);
    }
  };

  // Function to add a condition
  const handleAddCondition = (type = 'attribute') => {
    const newId = Math.max(...conditions.map(c => c.id), ...conditionGroups.map(g => g.id), 0) + 1;
    
    if (type === 'attribute') {
      setConditions([
        ...conditions,
        {
          id: newId,
          type: 'attribute',
          field: '',
          operator: '',
          value: null
        }
      ]);
    } else if (type === 'event') {
      setConditions([
        ...conditions,
        {
          id: newId,
          type: 'event',
          eventType: 'performed',
          eventName: '',
          frequency: 'at_least',
          count: 1,
          timePeriod: 'days',
          timeValue: 30
        }
      ]);
    }
  };

  // Function to add a condition group
  const handleAddConditionGroup = () => {
    const newId = Math.max(...conditions.map(c => c.id), ...conditionGroups.map(g => g.id), 0) + 1;
    
    setConditionGroups([
      ...conditionGroups,
      {
        id: newId,
        type: 'group',
        operator: 'AND',
        conditions: []
      }
    ]);
  };

  // Function to update a condition
  const handleUpdateCondition = (id, field, value) => {
    setConditions(conditions.map(condition => {
      if (condition.id === id) {
        return { ...condition, [field]: value };
      }
      return condition;
    }));
  };

  // Function to remove a condition
  const handleRemoveCondition = (id) => {
    setConditions(conditions.filter(condition => condition.id !== id));
  };

  // Function to update a condition group's operator
  const handleUpdateGroupOperator = (groupId, newOperator) => {
    setConditionGroups(conditionGroups.map(group => {
      if (group.id === groupId) {
        return { ...group, operator: newOperator };
      }
      return group;
    }));
  };

  // Function to add a condition to a group
  const handleAddConditionToGroup = (groupId, type = 'attribute') => {
    setConditionGroups(conditionGroups.map(group => {
      if (group.id === groupId) {
        const newId = Math.max(
          ...conditions.map(c => c.id),
          ...conditionGroups.map(g => g.id),
          ...group.conditions.map(c => c.id),
          0
        ) + 1;
        
        let newCondition;
        
        if (type === 'attribute') {
          newCondition = {
            id: newId,
            type: 'attribute',
            field: '',
            operator: '',
            value: null
          };
        } else if (type === 'event') {
          newCondition = {
            id: newId,
            type: 'event',
            eventType: 'performed',
            eventName: '',
            frequency: 'at_least',
            count: 1,
            timePeriod: 'days',
            timeValue: 30
          };
        }
        
        return {
          ...group,
          conditions: [...group.conditions, newCondition]
        };
      }
      return group;
    }));
  };

  // Function to update a condition within a group
  const handleUpdateGroupCondition = (groupId, conditionId, field, value) => {
    setConditionGroups(conditionGroups.map(group => {
      if (group.id === groupId) {
        const updatedConditions = group.conditions.map(condition => {
          if (condition.id === conditionId) {
            return { ...condition, [field]: value };
          }
          return condition;
        });
        
        return { ...group, conditions: updatedConditions };
      }
      return group;
    }));
  };

  // Function to remove a condition from a group
  const handleRemoveGroupCondition = (groupId, conditionId) => {
    setConditionGroups(conditionGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.filter(condition => condition.id !== conditionId)
        };
      }
      return group;
    }));
  };

  // Function to remove a condition group
  const handleRemoveConditionGroup = (groupId) => {
    setConditionGroups(conditionGroups.filter(group => group.id !== groupId));
  };

  // Functions for inclusion/exclusion
  const handleOpenSegmentSelector = (mode) => {
    setSelectionMode(mode);
    setSegmentSelectorOpen(true);
  };

  const handleCloseSegmentSelector = () => {
    setSegmentSelectorOpen(false);
  };

  const handleIncludeSegment = (segment) => {
    // Check if segment is already included
    if (!inclusions.some(inc => inc.id === segment.id)) {
      setInclusions([...inclusions, segment]);
      toast.success(`Added "${segment.name}" to inclusions`);
    } else {
      toast.info(`"${segment.name}" is already included`);
    }
    setSegmentSelectorOpen(false);
  };

  const handleExcludeSegment = (segment) => {
    // Check if segment is already excluded
    if (!exclusions.some(exc => exc.id === segment.id)) {
      setExclusions([...exclusions, segment]);
      toast.success(`Added "${segment.name}" to exclusions`);
    } else {
      toast.info(`"${segment.name}" is already excluded`);
    }
    setSegmentSelectorOpen(false);
  };

  const handleRemoveInclusion = (segmentId) => {
    setInclusions(inclusions.filter(segment => segment.id !== segmentId));
  };

  const handleRemoveExclusion = (segmentId) => {
    setExclusions(exclusions.filter(segment => segment.id !== segmentId));
  };

  // Function to add attribute as a condition when clicked in the details list
  const handleAttributeClick = (attribute) => {
    const newId = Math.max(...conditions.map(c => c.id), ...conditionGroups.map(g => g.id), 0) + 1;
    
    const newCondition = {
      id: newId,
      type: 'attribute',
      field: attribute.name,
      operator: getDefaultOperatorForType(attribute.type),
      value: null
    };
    
    setConditions([...conditions, newCondition]);
    toast.info(`Added condition for "${attribute.name}"`);
  };

  // Helper to get default operator for a type
  const getDefaultOperatorForType = (type) => {
    switch (type) {
      case 'text': return 'equals';
      case 'number': return 'equals';
      case 'datetime': return 'after';
      case 'boolean': return 'equals';
      case 'array': return 'contains';
      default: return 'equals';
    }
  };

  // Function to render an attribute condition
  const renderAttributeCondition = (condition, isInGroup = false, groupId = null) => {
    const attribute = attributes.find(attr => attr.name === condition.field);
    const attributeType = attribute ? attribute.type : 'text';
    const operators = OPERATORS[attributeType] || OPERATORS.text;

    return (
      <Box sx={{ 
        mb: 2,
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        p: 1.5,
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* Drag handle (visual only for now) */}
        <DragIndicatorIcon 
          sx={{ 
            color: '#ccc', 
            cursor: 'grab',
            mr: 1,
            fontSize: 20
          }} 
        />

        {/* Field select */}
        <FormControl size="small" sx={{ minWidth: 160, mr: 1 }}>
          <Select
            value={condition.field || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (isInGroup) {
                handleUpdateGroupCondition(groupId, condition.id, 'field', newValue);
              } else {
                handleUpdateCondition(condition.id, 'field', newValue);
              }
            }}
            displayEmpty
            renderValue={(value) => value || 'Select field'}
          >
            <MenuItem value="" disabled>Select field</MenuItem>
            {attributes.map(attr => (
              <MenuItem key={attr.name} value={attr.name}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box component="span" sx={{ width: 20, mr: 1, color: '#999' }}>
                    {attr.type === 'number' ? '#' : 
                     attr.type === 'datetime' ? '⏱' : 
                     attr.type === 'boolean' ? '✓' :
                     attr.type === 'array' ? '[]' : 'T'}
                  </Box>
                  {attr.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Operator select */}
        <FormControl size="small" sx={{ minWidth: 140, mr: 1 }}>
          <Select
            value={condition.operator || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (isInGroup) {
                handleUpdateGroupCondition(groupId, condition.id, 'operator', newValue);
              } else {
                handleUpdateCondition(condition.id, 'operator', newValue);
              }
            }}
            displayEmpty
            renderValue={(value) => {
              if (!value) return 'Select operator';
              const op = operators.find(o => o.value === value);
              return op ? op.label : value;
            }}
            disabled={!condition.field}
          >
            <MenuItem value="" disabled>Select operator</MenuItem>
            {operators.map(op => (
              <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Value input - only show for operators that need values */}
        {condition.operator && 
         !['is_null', 'is_not_null', 'is_empty', 'is_not_empty'].includes(condition.operator) && (
          <TextField
            placeholder="Value"
            value={condition.value || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (isInGroup) {
                handleUpdateGroupCondition(groupId, condition.id, 'value', newValue);
              } else {
                handleUpdateCondition(condition.id, 'value', newValue);
              }
            }}
            size="small"
            sx={{ flexGrow: 1, mr: 1 }}
          />
        )}

        {/* Additional value input for "between" operator */}
        {condition.operator === 'between' && (
          <>
            <Typography variant="body2" sx={{ mx: 1 }}>and</Typography>
            <TextField
              placeholder="End value"
              value={condition.value2 || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                if (isInGroup) {
                  handleUpdateGroupCondition(groupId, condition.id, 'value2', newValue);
                } else {
                  handleUpdateCondition(condition.id, 'value2', newValue);
                }
              }}
              size="small"
              sx={{ flexGrow: 1, mr: 1 }}
            />
          </>
        )}

        {/* Delete button */}
        <IconButton 
          size="small" 
          onClick={() => {
            if (isInGroup) {
              handleRemoveGroupCondition(groupId, condition.id);
            } else {
              handleRemoveCondition(condition.id);
            }
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  // Function to render an event condition (continued)
  const renderEventCondition = (condition, isInGroup = false, groupId = null) => {
    return (
      <Box sx={{ 
        mb: 2,
        bgcolor: '#f5f8ff', 
        border: '1px solid #e0e6f5',
        borderRadius: 1,
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <EventIcon sx={{ mr: 1, color: '#3f51b5' }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {condition.eventType === 'not_performed' ? 'Did not perform' : 
             condition.eventType === 'first_time' ? 'First time performed' :
             condition.eventType === 'last_time' ? 'Last time performed' : 'Performed'}
          </Typography>
          <Box sx={{ ml: 2, flexGrow: 1 }}>
            <FormControl fullWidth size="small">
              <Select
                value={condition.eventType || 'performed'}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (isInGroup) {
                    handleUpdateGroupCondition(groupId, condition.id, 'eventType', newValue);
                  } else {
                    handleUpdateCondition(condition.id, 'eventType', newValue);
                  }
                }}
                displayEmpty
                sx={{ '& .MuiSelect-select': { py: 1 } }}
              >
                {EVENT_CONDITION_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <IconButton 
            size="small" 
            onClick={() => {
              if (isInGroup) {
                handleRemoveGroupCondition(groupId, condition.id);
              } else {
                handleRemoveCondition(condition.id);
              }
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
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
            placeholder="Event name" 
            variant="outlined" 
            size="small" 
            sx={{ flexGrow: 1 }}
            value={condition.eventName || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              if (isInGroup) {
                handleUpdateGroupCondition(groupId, condition.id, 'eventName', newValue);
              } else {
                handleUpdateCondition(condition.id, 'eventName', newValue);
              }
            }}
          />
        </Box>

        {!['first_time', 'last_time'].includes(condition.eventType) && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, width: '80px' }}>
              occurring
            </Typography>
            <FormControl size="small" sx={{ width: '120px', mr: 2 }}>
              <Select
                value={condition.frequency || 'at_least'}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (isInGroup) {
                    handleUpdateGroupCondition(groupId, condition.id, 'frequency', newValue);
                  } else {
                    handleUpdateCondition(condition.id, 'frequency', newValue);
                  }
                }}
                displayEmpty
                sx={{ '& .MuiSelect-select': { py: 1 } }}
              >
                {FREQUENCY_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              value={condition.count || '1'}
              type="number"
              InputProps={{ inputProps: { min: 1 } }}
              onChange={(e) => {
                const newValue = e.target.value;
                if (isInGroup) {
                  handleUpdateGroupCondition(groupId, condition.id, 'count', newValue);
                } else {
                  handleUpdateCondition(condition.id, 'count', newValue);
                }
              }}
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
              value={condition.timeValue || '30'}
              type="number"
              InputProps={{ inputProps: { min: 1 } }}
              onChange={(e) => {
                const newValue = e.target.value;
                if (isInGroup) {
                  handleUpdateGroupCondition(groupId, condition.id, 'timeValue', newValue);
                } else {
                  handleUpdateCondition(condition.id, 'timeValue', newValue);
                }
              }}
              variant="outlined" 
              size="small" 
              sx={{ width: '80px', mr: 2 }}
            />
            <FormControl size="small" sx={{ width: '100px' }}>
              <Select
                value={condition.timePeriod || 'days'}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (isInGroup) {
                    handleUpdateGroupCondition(groupId, condition.id, 'timePeriod', newValue);
                  } else {
                    handleUpdateCondition(condition.id, 'timePeriod', newValue);
                  }
                }}
                displayEmpty
                sx={{ '& .MuiSelect-select': { py: 1 } }}
              >
                {TIME_PERIOD_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {['first_time', 'last_time'].includes(condition.eventType) && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, width: '80px' }}>
              within
            </Typography>
            <FormControl size="small" sx={{ width: '120px', mr: 2 }}>
              <Select
                value="last"
                displayEmpty
                sx={{ '& .MuiSelect-select': { py: 1 } }}
              >
                <MenuItem value="last">last</MenuItem>
              </Select>
            </FormControl>
            <TextField 
              value={condition.timeValue || '30'}
              type="number"
              InputProps={{ inputProps: { min: 1 } }}
              onChange={(e) => {
                const newValue = e.target.value;
                if (isInGroup) {
                  handleUpdateGroupCondition(groupId, condition.id, 'timeValue', newValue);
                } else {
                  handleUpdateCondition(condition.id, 'timeValue', newValue);
                }
              }}
              variant="outlined" 
              size="small" 
              sx={{ width: '80px', mr: 2 }}
            />
            <FormControl size="small" sx={{ width: '100px' }}>
              <Select
                value={condition.timePeriod || 'days'}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (isInGroup) {
                    handleUpdateGroupCondition(groupId, condition.id, 'timePeriod', newValue);
                  } else {
                    handleUpdateCondition(condition.id, 'timePeriod', newValue);
                  }
                }}
                displayEmpty
                sx={{ '& .MuiSelect-select': { py: 1 } }}
              >
                {TIME_PERIOD_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>
    );
  };

  // Function to add a related dataset condition
  const handleAddRelatedCondition = () => {
    const newId = Math.max(...conditions.map(c => c.id), ...conditionGroups.map(g => g.id), 0) + 1;
    
    setConditions([
      ...conditions,
      {
        id: newId,
        type: 'related',
        relatedDataset: '',
        relation: 'where',
        nestedConditions: []
      }
    ]);
  };

  // Function to render a related dataset condition
  const renderRelatedDatasetCondition = (condition, isInGroup = false, groupId = null) => {
    const relatedOptions = relatedDatasets[selectedDataset] || [];

    return (
      <Box sx={{ 
        mb: 2,
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        p: 2,
        bgcolor: '#f9f9ff'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LinkIcon sx={{ mr: 1, color: '#5c6bc0' }} />
          <Typography variant="body2" sx={{ fontWeight: 500, mr: 2 }}>
            Related to
          </Typography>
          <FormControl size="small" sx={{ width: '200px', mr: 2 }}>
            <Select
              value={condition.relatedDataset || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                if (isInGroup) {
                  handleUpdateGroupCondition(groupId, condition.id, 'relatedDataset', newValue);
                } else {
                  handleUpdateCondition(condition.id, 'relatedDataset', newValue);
                }
              }}
              displayEmpty
              renderValue={(value) => value || 'Select related dataset'}
            >
              <MenuItem value="" disabled>Select related dataset</MenuItem>
              {relatedOptions.map(dataset => (
                <MenuItem key={dataset} value={dataset}>{dataset}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton 
            size="small"
            onClick={() => {
              if (isInGroup) {
                handleRemoveGroupCondition(groupId, condition.id);
              } else {
                handleRemoveCondition(condition.id);
              }
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>

        {condition.relatedDataset && (
          <Box sx={{ pl: 3 }}>
            <FormControl size="small" sx={{ width: '150px', mr: 2 }}>
              <Select
                value={condition.relation || 'where'}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (isInGroup) {
                    handleUpdateGroupCondition(groupId, condition.id, 'relation', newValue);
                  } else {
                    handleUpdateCondition(condition.id, 'relation', newValue);
                  }
                }}
                displayEmpty
              >
                <MenuItem value="where">where</MenuItem>
                <MenuItem value="having">having</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: '#f5f5f5', 
              borderRadius: 1,
              border: '1px dashed #ccc'
            }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666' }}>
                Define conditions for {condition.relatedDataset} (nested conditions would go here)
              </Typography>
              <Button 
                size="small" 
                startIcon={<AddIcon />} 
                sx={{ mt: 1, textTransform: 'none' }}
                onClick={() => {
                  // In a real implementation, you would add nested conditions here
                  toast.info(`Adding nested condition for ${condition.relatedDataset}`);
                }}
              >
                Add related condition
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // Function to render condition groups
  const renderConditionGroup = (group) => {
    return (
      <Box sx={{ 
        mb: 3, 
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 500, mr: 2 }}>
            Group of conditions
          </Typography>
          <ToggleButtonGroup
            value={group.operator}
            exclusive
            onChange={(e, newValue) => {
              if (newValue) {
                handleUpdateGroupOperator(group.id, newValue);
              }
            }}
            size="small"
            sx={{ mr: 'auto' }}
          >
            <ToggleButton value="AND" sx={{ textTransform: 'none' }}>
              AND
            </ToggleButton>
            <ToggleButton value="OR" sx={{ textTransform: 'none' }}>
              OR
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton 
            size="small"
            onClick={() => handleRemoveConditionGroup(group.id)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Group conditions */}
        <Box sx={{ pl: 2, borderLeft: '3px solid #e0e0e0' }}>
          {group.conditions.map(condition => {
            if (condition.type === 'attribute') {
              return renderAttributeCondition(condition, true, group.id);
            } else if (condition.type === 'event') {
              return renderEventCondition(condition, true, group.id);
            } else if (condition.type === 'related') {
              return renderRelatedDatasetCondition(condition, true, group.id);
            }
            return null;
          })}

          {group.conditions.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
              No conditions in this group yet. Add conditions below.
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TuneIcon />}
              onClick={() => handleAddConditionToGroup(group.id, 'attribute')}
              sx={{ textTransform: 'none' }}
            >
              Add attribute
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EventIcon />}
              onClick={() => handleAddConditionToGroup(group.id, 'event')}
              sx={{ textTransform: 'none' }}
            >
              Add event
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LinkIcon />}
              onClick={() => handleAddConditionToGroup(group.id, 'related')}
              sx={{ textTransform: 'none' }}
            >
              Add related
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  // Function to render inclusion/exclusion section
  const renderInclusionExclusion = () => {
    return (
      <Box sx={{ mt: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Include or Exclude Other Segments
        </Typography>
        
        {/* Inclusions */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight={500} gutterBottom>
            Include records that are in:
          </Typography>
          
          {inclusions.length > 0 ? (
            <Box sx={{ mb: 2 }}>
              {inclusions.map(segment => (
                <Chip
                  key={segment.id}
                  label={`${segment.name} (${segment.count})`}
                  onDelete={() => handleRemoveInclusion(segment.id)}
                  color="primary"
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
              No inclusions defined
            </Typography>
          )}
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => handleOpenSegmentSelector('include')}
            sx={{ textTransform: 'none' }}
          >
            Add segment inclusion
          </Button>
        </Box>
        
        {/* Exclusions */}
        <Box>
          <Typography variant="body1" fontWeight={500} gutterBottom>
            Exclude records that are in:
          </Typography>
          
          {exclusions.length > 0 ? (
            <Box sx={{ mb: 2 }}>
              {exclusions.map(segment => (
                <Chip
                  key={segment.id}
                  label={`${segment.name} (${segment.count})`}
                  onDelete={() => handleRemoveExclusion(segment.id)}
                  color="error"
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
              No exclusions defined
            </Typography>
          )}
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => handleOpenSegmentSelector('exclude')}
            sx={{ textTransform: 'none' }}
          >
            Add segment exclusion
          </Button>
        </Box>
      </Box>
    );
  };

  // Render segment selector dialog
  const renderSegmentSelectorDialog = () => {
    return (
      <Dialog
        open={segmentSelectorOpen}
        onClose={handleCloseSegmentSelector}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectionMode === 'include' ? 'Include Records from Segment' : 'Exclude Records from Segment'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            Select a segment to {selectionMode === 'include' ? 'include' : 'exclude'} in your current segment definition.
            This will {selectionMode === 'include' ? 'limit' : 'remove'} records based on their membership in the selected segment.
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Segment Name</TableCell>
                  <TableCell>Resource ID</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableSegments.map(segment => (
                  <TableRow key={segment.id} hover>
                    <TableCell>{segment.name}</TableCell>
                    <TableCell>{segment.id}</TableCell>
                    <TableCell align="right">{segment.count}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        color={selectionMode === 'include' ? 'primary' : 'error'}
                        size="small"
                        onClick={() => {
                          if (selectionMode === 'include') {
                            handleIncludeSegment(segment);
                          } else {
                            handleExcludeSegment(segment);
                          }
                        }}
                      >
                        {selectionMode === 'include' ? 'Include' : 'Exclude'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {availableSegments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No segments available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSegmentSelector}>Cancel</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Function to generate SQL preview
  const generateSQLPreview = () => {
    const dataset = datasets[selectedDataset];
    let tableName = dataset?.name || selectedDataset.toLowerCase();
    
    // Add schema prefix if it exists and is not 'public'
    if (dataset?.schema && dataset.schema !== 'public') {
      tableName = `${dataset.schema}.${tableName}`;
    }
    
    // Start with a simple SELECT statement
    let sql = `SELECT * FROM ${tableName}`;
    
    // Add WHERE clause for conditions
    const conditionClauses = [];
    
    // Only process attribute conditions to keep it simple and reliable
    conditions.forEach(condition => {
      if (condition.type === 'attribute' && condition.field && condition.operator) {
        let clause = '';
        
        // Get the attribute type to handle different data types correctly
        const attribute = attributes.find(attr => attr.name === condition.field);
        const attributeType = attribute ? attribute.type : 'text';
        const isNumeric = attributeType === 'number';
        
        // Handle different operators with proper SQL syntax
        switch (condition.operator) {
          case 'equals':
            clause = isNumeric 
              ? `${condition.field} = ${condition.value}` 
              : `${condition.field} = '${condition.value}'`;
            break;
          case 'not_equals':
            clause = isNumeric 
              ? `${condition.field} != ${condition.value}` 
              : `${condition.field} != '${condition.value}'`;
            break;
          case 'contains':
            clause = `${condition.field} LIKE '%${condition.value}%'`;
            break;
          case 'not_contains':
            clause = `${condition.field} NOT LIKE '%${condition.value}%'`;
            break;
          case 'starts_with':
            clause = `${condition.field} LIKE '${condition.value}%'`;
            break;
          case 'ends_with':
            clause = `${condition.field} LIKE '%${condition.value}'`;
            break;
          case 'is_null':
            clause = `${condition.field} IS NULL`;
            break;
          case 'is_not_null':
            clause = `${condition.field} IS NOT NULL`;
            break;
          case 'greater_than':
            clause = isNumeric 
              ? `${condition.field} > ${condition.value}` 
              : `${condition.field} > '${condition.value}'`;
            break;
          case 'less_than':
            clause = isNumeric 
              ? `${condition.field} < ${condition.value}` 
              : `${condition.field} < '${condition.value}'`;
            break;
          case 'between':
            if (condition.value && condition.value2) {
              if (isNumeric) {
                clause = `${condition.field} BETWEEN ${condition.value} AND ${condition.value2}`;
              } else {
                clause = `${condition.field} BETWEEN '${condition.value}' AND '${condition.value2}'`;
              }
            }
            break;
        }
        
        if (clause) {
        conditionClauses.push(clause);
        }
      }
    });
    
    // Add the WHERE clause if we have conditions
    if (conditionClauses.length > 0) {
      sql += `\nWHERE ${conditionClauses.join(`\n  ${rootOperator} `)}`;
    } else {
      // Use WHERE 1=1 if no conditions to ensure we get results
      sql += '\nWHERE 1=1';
    }
    
    // Add limit to prevent returning too many rows
    sql += '\nLIMIT 100';
    
    return sql;
  };

  // Function to fetch preview data based on current conditions
  const fetchPreviewData = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true); // Open dialog immediately to show loading state
    
    try {
      const sqlQuery = generateSQLPreview();
      
      // Get connection URL from localStorage
      const connectionUrl = localStorage.getItem('postgres_connection');
      
      if (!connectionUrl) {
        toast.error("Connection URL not configured. Please set the connection URL first.");
        setPreviewLoading(false);
        return;
      }
      
      console.log("Executing SQL query for preview:", sqlQuery);
      
      // Parse the connection URL to extract components like in App.js
      // This follows the same approach used in App.js executeQuery function
      try {
        const url = new URL(connectionUrl);
        const [username, password] = (url.username + ':' + url.password).split(':');
        const host = url.hostname;
        const port = url.port;
        const database = url.pathname.replace('/', '');
        
        // Format request data to match what the API expects
        const requestData = {
          table: datasets[selectedDataset].name,
          query: sqlQuery,
          connection_details: {
            host,
            port,
            database,
            username,
            password
          }
        };
        
        console.log("Sending request to API with connection details:", {
          ...requestData,
          connection_details: {
            ...requestData.connection_details,
            password: '***' // Hide password in logs
          }
        });
        
        // Call the API endpoint that exists and works with App.js
        const response = await axios.post(`${API_BASE_URL}/api/query`, requestData);
        
        console.log("Preview API response:", response.data);
        
        // Process the response based on the actual API structure
        if (response.data && response.data.success) {
          // The app.py endpoint returns data in this format
          setPreviewData(response.data.data || []);
          
          if (response.data.data && response.data.data.length > 0) {
            toast.success(`Retrieved ${response.data.data.length} records`);
          } else {
            toast.warning("Query executed successfully but returned no records");
          }
        } else {
          toast.warning("No results returned. Your query may be too restrictive or there's no matching data.");
          setPreviewData([]);
        }
      } catch (error) {
        console.error('Error parsing connection URL or executing query:', error);
        
        // Handle different error types
        if (error.response) {
          // The API responded with an error status
          const errorDetail = error.response.data?.detail || "Unknown error occurred";
          console.error('Error response:', errorDetail);
          toast.error(`Query error: ${errorDetail}`);
        } else if (error.request) {
          // The request was made but no response received
          toast.error("No response from server. Check your network connection.");
    } else {
          // Something else went wrong
          toast.error(`Error: ${error.message}`);
        }
        
        setPreviewData([]);
      }
    } catch (error) {
      console.error('Unexpected error in fetchPreviewData:', error);
      toast.error(`Unexpected error: ${error.message}`);
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // Function to handle closing the preview dialog
  const handleClosePreview = () => {
    setPreviewOpen(false);
  };
  
  // Function to render the preview dialog
  const renderPreviewDialog = () => {
    // Determine columns based on the first result row
    const columns = previewData.length > 0 
      ? Object.keys(previewData[0]).filter(col => col !== '__rowid__')
      : [];
      
    return (
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Preview Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {previewData.length > 0 
                ? `Showing ${previewData.length} records` 
                : previewLoading 
                  ? 'Loading...' 
                  : 'No records found'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          {previewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
              <Typography>Loading preview data...</Typography>
            </Box>
          ) : previewData.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No results match your current conditions. Try adjusting your filters or check your database connection.
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {columns.map(column => (
                      <TableCell key={column}>
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow hover key={row.__rowid__ || rowIndex}>
                      {columns.map(column => (
                        <TableCell key={`${rowIndex}-${column}`}>
                          {formatCellValue(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={() => {
              const sql = generateSQLPreview();
              navigator.clipboard.writeText(sql);
              toast.success('SQL query copied to clipboard');
              console.log('SQL Query:', sql);
            }}
          >
            Copy SQL
          </Button>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  // Helper function to format cell values for display
  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  // Update the main Definition tab content
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
            startIcon={<CodeIcon />}
          >
            View SQL
          </Button>
          <Button 
            variant="outlined" 
            sx={{ mx: 0.5 }}
            onClick={fetchPreviewData}
            disabled={previewLoading}
          >
            {previewLoading ? 'Loading...' : 'Preview Results'}
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
                    renderValue={(selected) => {
                      const dataset = datasets[selected] || {};
                      return (
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
                          {dataset.schema && dataset.schema !== 'public' && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({dataset.schema})
                            </Typography>
                    )}
                        </Box>
                      );
                    }}
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
                          <Box>
                          {name}
                            {info.schema && info.schema !== 'public' && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {info.schema}
                              </Typography>
                            )}
                          </Box>
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
                    sx={{ mb: 3 }}
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
                      color: '#666',
                      mb: 3
                    }}
                  >
                    Add Description
                  </Button>
                )}
              </Box>

              {/* Condition builder area */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  mb: 2
                }}>
                  <Typography variant="h6">
                    Conditions
                  </Typography>
                  <ToggleButtonGroup
                    value={rootOperator}
                    exclusive
                    onChange={handleRootOperatorChange}
                    size="small"
                  >
                    <ToggleButton value="AND" sx={{ textTransform: 'none' }}>
                      AND
                    </ToggleButton>
                    <ToggleButton value="OR" sx={{ textTransform: 'none' }}>
                      OR
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Individual conditions */}
                {conditions.map(condition => {
                  if (condition.type === 'attribute') {
                    return renderAttributeCondition(condition);
                  } else if (condition.type === 'event') {
                    return renderEventCondition(condition);
                  } else if (condition.type === 'related') {
                    return renderRelatedDatasetCondition(condition);
                  }
                  return null;
                })}

                {/* Condition groups */}
                {conditionGroups.map(group => renderConditionGroup(group))}

                {/* Add buttons */}
                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<TuneIcon />}
                    size="small"
                    onClick={() => handleAddCondition('attribute')}
                    sx={{ textTransform: 'none' }}
                  >
                    Add attribute condition
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<EventIcon />}
                    size="small"
                    onClick={() => handleAddCondition('event')}
                    sx={{ textTransform: 'none' }}
                  >
                    Add event condition
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    size="small"
                    onClick={() => handleAddRelatedCondition()}
                    sx={{ textTransform: 'none' }}
                  >
                    Add related data
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<GroupIcon />}
                    size="small"
                    onClick={handleAddConditionGroup}
                    sx={{ textTransform: 'none' }}
                  >
                    Add condition group
                  </Button>
                </Box>
              </Box>

              {/* Inclusion/Exclusion section */}
              {renderInclusionExclusion()}

              {/* SQL Preview section */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  SQL Preview
                </Typography>
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{ p: 2, bgcolor: '#f8f9fa', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                  {generateSQLPreview()}
                </Paper>
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
                    <Tooltip title="Estimated number of records in this segment based on your current conditions">
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
                    </Tooltip>
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

              {/* Details list */}
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
                              onClick={() => handleAttributeClick(attr)}
                            >
                              <Box component="span" sx={{ width: 20, mr: 1, color: '#999', fontSize: '0.85rem' }}>
                                {attr.type === 'number' ? '#' : 
                                 attr.type === 'datetime' ? '⏱' : 
                                 attr.type === 'boolean' ? '✓' :
                                 attr.type === 'array' ? '[]' : 'T'}
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

      {/* Segment selector dialog */}
      {renderSegmentSelectorDialog()}

      {/* Preview results dialog */}
      {renderPreviewDialog()}
    </Box>
  );
};

export default SegmentBuilder;