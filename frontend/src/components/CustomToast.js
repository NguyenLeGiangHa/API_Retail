import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export const CustomToast = ({ type, title, message, details }) => {
  const isSuccess = type === 'success';
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        minWidth: '300px',
      }}
    >
      {isSuccess ? (
        <CheckCircleIcon color="success" />
      ) : (
        <ErrorIcon color="error" />
      )}
      <Box>
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        <Typography variant="body2">
          {message}
        </Typography>
        {details && (
          <Box sx={{ mt: 1 }}>
            {Object.entries(details).map(([key, value]) => (
              <Typography key={key} variant="body2" color="text.secondary">
                {key}: {value}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}; 