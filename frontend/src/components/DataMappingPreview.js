import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

export const DataMappingPreview = ({ sourceData, mappedData, tableName }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Data Mapping Preview: {tableName}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Source Column</TableCell>
              <TableCell>Target Column</TableCell>
              <TableCell>Sample Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(mappedData).map(([targetCol, sourceCol]) => (
              <TableRow key={targetCol}>
                <TableCell>{sourceCol}</TableCell>
                <TableCell>{targetCol}</TableCell>
                <TableCell>
                  {sourceData[sourceCol] ? sourceData[sourceCol][0] : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}; 