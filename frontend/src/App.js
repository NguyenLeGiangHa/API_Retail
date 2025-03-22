import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast.css';
import './styles/segmentation.css';
import {
  Container,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-github';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import SegmentsList from './components/SegmentsList';
import SegmentBuilder from './components/SegmentBuilder';

const API_BASE_URL = 'http://localhost:8000';
const CONNECTION_STORAGE_KEY = 'postgres_connection';
const CONNECTION_EXPIRY_KEY = 'postgres_connection_expiry';
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

function App() {
  const [selectedTable, setSelectedTable] = useState('');
  const [query, setQuery] = useState('');
  const [tables, setTables] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [connectionDialog, setConnectionDialog] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayUrl, setDisplayUrl] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [showSegmentBuilder, setShowSegmentBuilder] = useState(false);

  useEffect(() => {
    // Check for stored connection details
    const storedConnection = localStorage.getItem(CONNECTION_STORAGE_KEY);
    const expiryTime = localStorage.getItem(CONNECTION_EXPIRY_KEY);
    
    if (storedConnection && expiryTime) {
      const now = new Date().getTime();
      if (now < parseInt(expiryTime)) {
        // Connection hasn't expired yet
        setConnectionUrl(storedConnection);
        updateDisplayUrl(storedConnection);
        fetchTables();
      } else {
        // Connection has expired, show dialog
        setConnectionDialog(true);
        // Clear expired storage
        localStorage.removeItem(CONNECTION_STORAGE_KEY);
        localStorage.removeItem(CONNECTION_EXPIRY_KEY);
      }
    } else {
      // No stored connection, show dialog
      setConnectionDialog(true);
    }
  }, []);

  // Function to update the display URL (hiding password)
  const updateDisplayUrl = (url) => {
    try {
      // Replace password with [HIDDEN] in display URL
      const regex = /(postgresql:\/\/[^:]+:)([^@]+)(@.*)/;
      const maskedUrl = url.replace(regex, '$1[HIDDEN]$3');
      setDisplayUrl(maskedUrl);
    } catch (e) {
      setDisplayUrl('Invalid connection URL');
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/tables`);
      console.log('Fetched tables:', response.data);
      setTables(response.data);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch tables';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (event) => {
    const table = event.target.value;
    setSelectedTable(table);
    if (table && tables[table]) {
      setQuery(`SELECT * FROM ${tables[table].name} LIMIT 5`);
    }
  };

  const handleConnectionSubmit = () => {
    if (!connectionUrl.trim()) {
      toast.error('Please provide a connection URL');
      return;
    }

    // Validate PostgreSQL connection URL format
    const urlRegex = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:[0-9]+\/[^/]+$/;
    if (!urlRegex.test(connectionUrl)) {
      toast.error('Invalid PostgreSQL connection URL format. Expected: postgresql://user:password@host:port/database');
      return;
    }

    // Store connection URL with expiry time
    const now = new Date().getTime();
    const expiryTime = now + ONE_HOUR_MS;
    
    localStorage.setItem(CONNECTION_STORAGE_KEY, connectionUrl);
    localStorage.setItem(CONNECTION_EXPIRY_KEY, expiryTime.toString());
    
    setConnectionDialog(false);
    toast.success('Connection details saved for 1 hour');
    
    // Fetch tables after successful connection
    fetchTables();
  };

  const handleQueryChange = (newValue) => {
    setQuery(newValue);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const executeQuery = async () => {
    if (!selectedTable || !query) {
      toast.error('Please select a table and enter a query');
      return;
    }

    if (!connectionUrl) {
      toast.error('Please provide database connection details');
      setConnectionDialog(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Extract connection details from URL
      const url = new URL(connectionUrl);
      const [username, password] = (url.username + ':' + url.password).split(':');
      const host = url.hostname;
      const port = url.port;
      const database = url.pathname.replace('/', '');

      const requestData = {
        table: tables[selectedTable].name,
        query: query,
        connection_details: {
          host,
          port,
          database,
          username,
          password
        }
      };

      console.log('Executing query with connection:', {
        ...requestData,
        connection_details: {
          ...requestData.connection_details,
          password: '***' // Hide password in logs
        }
      });

      const response = await axios.post(`${API_BASE_URL}/api/query`, requestData);

      console.log('Query response:', response.data);

      if (response.data.success) {
        setResults({
          data: response.data.data,
          columns: response.data.columns,
          row_count: response.data.row_count
        });

        toast.success(
          `Query executed successfully!\n` +
          `Retrieved ${response.data.row_count} rows from source database.\n` +
          `Inserted ${response.data.inserted_count} rows into data warehouse.`
        );
      } else {
        setError('Query executed but returned no results');
        toast.warning('Query returned no results');
      }
    } catch (err) {
      console.error('Query error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to execute query';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If the error is related to connection, show the dialog again
      if (errorMessage.includes('connection') || errorMessage.includes('Authentication')) {
        setConnectionDialog(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!connectionUrl.trim()) {
      toast.error('Please provide a connection URL');
      return;
    }

    try {
      setLoading(true);
      
      // Extract connection details from URL
      const url = new URL(connectionUrl);
      const [username, password] = (url.username + ':' + url.password).split(':');
      const host = url.hostname;
      const port = url.port;
      const database = url.pathname.replace('/', '');

      const response = await axios.post(`${API_BASE_URL}/api/test-connection`, {
        host,
        port, 
        database,
        username,
        password
      });

      if (response.data.success) {
        toast.success('Connection successful!');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Connection test failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!file || !selectedTable) {
      toast.error('Please select both a file and a table');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);
    try {
      console.log('Uploading file:', {
        table: tables[selectedTable].name,
        fileName: file.name,
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/upload/${tables[selectedTable].name}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Upload response:', response.data);
      setResults(response.data);
      
      if (response.data.success) {
        toast.success(`Successfully uploaded and processed ${response.data.rows_inserted} rows to ${tables[selectedTable].name}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to process file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return value.toString();
  };

  const changeConnection = () => {
    setConnectionDialog(true);
  };

  const handleConnectionUrlChange = (e) => {
    const url = e.target.value;
    setConnectionUrl(url);
    updateDisplayUrl(url);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Retail Analytics Platform
        </Typography>
        <Button 
          variant="outlined" 
          onClick={changeConnection}
        >
          Change Database Connection
        </Button>
      </Box>

      {connectionUrl && displayUrl && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
          <Typography variant="body2" color="text.secondary">
            Connected to: {displayUrl}
          </Typography>
        </Paper>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Data Modeling" />
          <Tab label="Segmentation" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box sx={{ mb: 4 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="table-select-label">Select Table</InputLabel>
            <Select
              labelId="table-select-label"
              id="table-select"
              value={selectedTable}
              onChange={handleTableChange}
              label="Select Table"
              disabled={loading}
            >
              {Object.entries(tables).map(([tableName, tableInfo]) => (
                <MenuItem key={tableName} value={tableName}>
                  {tableName} - {tableInfo.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              SQL Query
            </Typography>
            <AceEditor
              mode="sql"
              theme="github"
              value={query}
              onChange={handleQueryChange}
              name="sql-editor"
              editorProps={{ $blockScrolling: true }}
              width="100%"
              height="200px"
              fontSize={14}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={true}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={executeQuery}
              disabled={!selectedTable || !query || loading}
            >
              Execute Query
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                disabled={loading}
              />
              <label htmlFor="file-upload">
                <Button variant="outlined" component="span" disabled={loading}>
                  Choose File
                </Button>
              </label>
              {file && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={uploadFile}
                  disabled={loading}
                >
                  Upload
                </Button>
              )}
            </Box>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {typeof error === 'string' ? error : 'An error occurred'}
            </Alert>
          )}

          {selectedTable && tables[selectedTable] && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Table Schema: {selectedTable}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available fields:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {tables[selectedTable].fields.map((field) => (
                  <Chip key={field} label={field} variant="outlined" />
                ))}
              </Box>
            </Paper>
          )}

          {results?.data && (
            <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {results.columns.map((column) => (
                        <TableCell 
                          key={column}
                          sx={{ 
                            fontWeight: 'bold',
                            backgroundColor: '#f5f5f5'
                          }}
                        >
                          {column}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.data.map((row, rowIndex) => (
                      <TableRow key={rowIndex} hover>
                        {results.columns.map((column) => (
                          <TableCell key={`${rowIndex}-${column}`}>
                            {formatCellValue(row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ p: 2, borderTop: '1px solid rgba(224, 224, 224, 1)' }}>
                <Typography variant="body2" color="text.secondary">
                  Total rows: {results.row_count}
                </Typography>
              </Box>
            </Paper>
          )}

          {results?.message && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {results.message}
            </Alert>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {showSegmentBuilder ? (
            <SegmentBuilder onBack={() => setShowSegmentBuilder(false)} />
          ) : (
            <SegmentsList onCreateSegment={() => setShowSegmentBuilder(true)} />
          )}
        </Box>
      )}

      <Dialog 
        open={connectionDialog} 
        onClose={() => {
          if (connectionUrl) {
            setConnectionDialog(false);
          } else {
            toast.error("Please provide a connection URL to continue");
          }
        }}
        disableEscapeKeyDown={!connectionUrl}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid #e0e0e0', 
          px: 4, 
          py: 3,
          bgcolor: '#fafafa'
        }}>
          <Typography variant="h5" fontWeight="500">
            PostgreSQL Connection Details
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ px: 4, py: 3 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, color: '#424242' }}>
              Connection URL Format
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                bgcolor: '#f5f7fa', 
                borderColor: '#e0e6ed',
                borderRadius: 1,
                mb: 2
              }}
            >
              <Typography 
                variant="body2" 
                fontFamily="monospace" 
                sx={{ wordBreak: 'break-all' }}
              >
                postgresql://postgres.cyjehsjjvcakeizrehjy:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
              </Typography>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              This connection uses the Supabase Transaction Pooler (Supavisor), ideal for stateless applications.
              Connection details will be stored securely for 1 hour.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <TextField
              label="PostgreSQL Connection URL"
              value={connectionUrl}
              onChange={handleConnectionUrlChange}
              fullWidth
              required
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={toggleShowPassword}
                      edge="end"
                      sx={{ mr: 0.5 }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { py: 1.5 }  // Taller input field
              }}
            />
          </Box>
          
          <Alert 
            severity="info" 
            icon={<Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>ℹ️</Box>}
            sx={{ 
              bgcolor: '#e3f2fd', 
              border: '1px solid #bbdefb',
              borderRadius: 1,
              '& .MuiAlert-message': {
                color: '#0d47a1'
              }
            }}
          >
            <Typography variant="body2">
              Make sure your Supabase project allows connections from your current IP address.
              You can configure this in your Supabase project settings.
            </Typography>
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ 
          px: 4, 
          py: 3,
          borderTop: '1px solid #e0e0e0',
          bgcolor: '#fafafa'
        }}>
          {connectionUrl && (
            <Button 
              onClick={() => setConnectionDialog(false)}
              sx={{ 
                color: '#616161',
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.05)'
                }
              }}
            >
              Cancel
            </Button>
          )}
          <Button 
            onClick={testConnection} 
            disabled={loading || !connectionUrl}
            variant="outlined"
            sx={{ 
              ml: 2,
              px: 3,
              py: 1
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Test Connection'}
          </Button>
          <Button 
            onClick={handleConnectionSubmit} 
            variant="contained"
            disabled={loading || !connectionUrl}
            color="primary"
            sx={{ 
              ml: 2,
              px: 3,
              py: 1,
              bgcolor: '#1976d2',
              '&:hover': {
                bgcolor: '#1565c0'
              }
            }}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App; 