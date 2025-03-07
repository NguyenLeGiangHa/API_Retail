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
    } catch (err) {
      console.error('Error fetching tables:', err); // Debug log
      setError('Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (event) => {
    const table = event.target.value;
    console.log('Selected table:', table); // Debug log
    setSelectedTable(table);
    if (table && tables[table]) {
      const defaultQuery = `SELECT * FROM ${tables[table].name} LIMIT 5;`;
      console.log('Setting default query:', defaultQuery); // Debug log
      setQuery(defaultQuery);
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
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/query`, {
        query: query,
        source_type: sourceType,
        connection_details: sourceType === 'postgresql' ? {
          connection_string: connectionDetails.connectionString,
        } : null,
      });
      setResults(response.data);
      
      // Show success toast with mapping details
      toast.success(
        <CustomToast
          type="success"
          title="Data Mapped Successfully"
          message="Your data has been processed and mapped to the target table."
          details={{
            "Mapped Table": response.data.mapped_table,
            "Rows Inserted": response.data.row_count,
            "Processing Time": `${response.data.processing_time}ms`
          }}
        />,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to execute query';
      setError(errorMessage);
      toast.error(
        <CustomToast
          type="error"
          title="Processing Error"
          message={errorMessage}
        />,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
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
      const response = await axios.post(
        `${API_BASE_URL}/api/upload/${tables[selectedTable].name}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setResults({
        success: true,
        message: response.data.message,
        row_count: response.data.rows_inserted
      });

      // Show success toast for file upload
      toast.success(
        <CustomToast
          type="success"
          title="File Processed Successfully"
          message={response.data.message}
          details={{
            "Table": tables[selectedTable].name,
            "Rows Inserted": response.data.rows_inserted
          }}
        />,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to upload file';
      setError(errorMessage);
      toast.error(
        <CustomToast
          type="error"
          title="File Upload Error"
          message={errorMessage}
        />,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    } finally {
      setLoading(false);
    }
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
            disabled={!query || loading}
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
            />
            <label htmlFor="file-upload">
              <Button variant="outlined" component="span">
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
            {error}
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
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {results.columns.map((column) => (
                      <TableCell key={column}>{column}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {results.columns.map((column) => (
                        <TableCell key={`${rowIndex}-${column}`}>
                          {row[column]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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