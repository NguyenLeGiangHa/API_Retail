import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast.css';
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
} from '@mui/material';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-github';
import axios from 'axios';
import { CustomToast } from './components/CustomToast';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [selectedTable, setSelectedTable] = useState('');
  const [query, setQuery] = useState('');
  const [tables, setTables] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState('postgresql');
  const [connectionDialog, setConnectionDialog] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/tables`);
      console.log('Fetched tables:', response.data); // Debug log
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
      // Use a simple SELECT query as default
      setQuery(`SELECT * FROM ${tables[table].name} LIMIT 5`);
    }
  };

  const handleSourceTypeChange = (event) => {
    setSourceType(event.target.value);
    if (event.target.value === 'postgresql') {
      setConnectionDialog(true);
    }
  };

  const handleConnectionSubmit = () => {
    const connectionString = `postgresql://${connectionDetails.username}:${connectionDetails.password}@${connectionDetails.host}:${connectionDetails.port}/${connectionDetails.database}`;
    setConnectionDialog(false);
    // Store connection string for later use
    setConnectionDetails({
      ...connectionDetails,
      connectionString,
    });
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

    if (sourceType === 'postgresql' && !validateConnectionDetails()) {
      toast.error('Please provide all database connection details');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const requestData = {
        table: tables[selectedTable].name,
        query: query,
        connection_details: {
          host: connectionDetails.host,
          port: connectionDetails.port,
          database: connectionDetails.database,
          username: connectionDetails.username,
          password: connectionDetails.password
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
    } finally {
      setLoading(false);
    }
  };

  const validateConnectionDetails = () => {
    if (sourceType !== 'postgresql') return true;
    
    return (
      connectionDetails.host &&
      connectionDetails.port &&
      connectionDetails.database &&
      connectionDetails.username &&
      connectionDetails.password
    );
  };

  const testConnection = async () => {
    if (!validateConnectionDetails()) {
      toast.error('Please provide all connection details');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/test-connection`, {
        connection_details: {
          host: connectionDetails.host,
          port: connectionDetails.port,
          database: connectionDetails.database,
          username: connectionDetails.username,
          password: connectionDetails.password
        }
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

      <Typography variant="h4" gutterBottom>
        Retail Analytics Platform
      </Typography>

      <Box sx={{ mb: 4 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Data Source</InputLabel>
          <Select
            value={sourceType}
            onChange={handleSourceTypeChange}
            label="Data Source"
          >
            <MenuItem value="postgresql">PostgreSQL Database</MenuItem>
            <MenuItem value="file">CSV/Excel File</MenuItem>
            <MenuItem value="googlesheets">Google Sheets</MenuItem>
          </Select>
        </FormControl>

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

      <Dialog open={connectionDialog} onClose={() => setConnectionDialog(false)}>
        <DialogTitle>PostgreSQL Connection Details</DialogTitle>
        <DialogContent>
          <TextField
            label="Host"
            value={connectionDetails.host}
            onChange={(e) => setConnectionDetails({...connectionDetails, host: e.target.value})}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Port"
            value={connectionDetails.port}
            onChange={(e) => setConnectionDetails({...connectionDetails, port: e.target.value})}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Database"
            value={connectionDetails.database}
            onChange={(e) => setConnectionDetails({...connectionDetails, database: e.target.value})}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Username"
            value={connectionDetails.username}
            onChange={(e) => setConnectionDetails({...connectionDetails, username: e.target.value})}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Password"
            type="password"
            value={connectionDetails.password}
            onChange={(e) => setConnectionDetails({...connectionDetails, password: e.target.value})}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectionDialog(false)}>Cancel</Button>
          <Button onClick={handleConnectionSubmit} variant="contained">
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App; 