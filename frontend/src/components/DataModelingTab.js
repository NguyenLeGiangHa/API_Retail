import React, { useState, useEffect } from 'react';
import {
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
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

export const DataModelingTab = () => {
  const [selectedTable, setSelectedTable] = useState('');
  const [query, setQuery] = useState('');
  const [tables, setTables] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
    // Show connection dialog on initial load
    setConnectionDialog(true);
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/tables`);
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
      setQuery(`SELECT * FROM ${tables[table].name} LIMIT 5;`);
    }
  };

  const handleConnectionSubmit = () => {
    if (!validateConnectionDetails()) {
      toast.error('Please provide all connection details');
      return;
    }
    setConnectionDialog(false);
    toast.success('Connection details saved');
  };

  const handleQueryChange = (newValue) => {
    setQuery(newValue);
  };

  const executeQuery = async () => {
    if (!selectedTable || !query) {
      toast.error('Please select a table and enter a query');
      return;
    }

    if (!validateConnectionDetails()) {
      toast.error('Please provide all database connection details');
      setConnectionDialog(true);
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

      const response = await axios.post(`${API_BASE_URL}/api/query`, requestData);

      if (response.data.success) {
        setResults({
          data: response.data.data,
          columns: response.data.columns,
          row_count: response.data.row_count
        });

        if (response.data.inserted_count > 0) {
          toast.success(
            `Query executed successfully! Retrieved ${response.data.row_count} rows and inserted ${response.data.inserted_count} rows into data warehouse.`
          );
        } else {
          toast.warning(
            `Query executed successfully! Retrieved ${response.data.row_count} rows but could not insert into data warehouse.`
          );
        }
      } else {
        setError('Query executed but returned no results');
        toast.warning('Query returned no results');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to execute query';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateConnectionDetails = () => {
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
        host: connectionDetails.host,
        port: connectionDetails.port,
        database: connectionDetails.database,
        username: connectionDetails.username,
        password: connectionDetails.password
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

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return value.toString();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <FormControl sx={{ width: '70%' }}>
          <InputLabel>Select Table</InputLabel>
          <Select
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
        
        <Button 
          variant="outlined" 
          onClick={() => setConnectionDialog(true)}
          sx={{ height: 56 }}
        >
          Database Connection
        </Button>
      </Box>

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
          <Button onClick={testConnection} disabled={loading}>
            Test Connection
          </Button>
          <Button onClick={handleConnectionSubmit} variant="contained" disabled={loading}>
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 