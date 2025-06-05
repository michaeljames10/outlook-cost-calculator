import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';

const FileUploader = () => {
  const [filteredData, setFilteredData] = useState([]);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;

        const filtered = data.map(row => ({
          Subject: row["Subject"] || '',
          "Start Time": `${row["Start Date"]} ${row["Start Time"]}`.trim(),
          "End Time": `${row["End Date"]} ${row["End Time"]}`.trim(),
        }));

        setFilteredData(filtered);
      }
    });
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    noClick: true,
    noKeyboard: true
  });

  return (
    <Box sx={{ p: 4 }}>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed #aaa',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: '#f9f9f9',
          mb: 4
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="h6" gutterBottom>
          Drag and drop a CSV file here
        </Typography>
        <Typography variant="body2" color="textSecondary">
          or
        </Typography>
        <Button variant="contained" onClick={open} sx={{ mt: 2 }}>
          Select File
        </Button>
      </Box>

      {filteredData.length > 0 && (
        <TableContainer component={Paper}   sx={{
    overflowX: 'auto',
    maxWidth: '100%',
    width: '100%',
    '& td, & th': {
      whiteSpace: 'normal',
      wordWrap: 'break-word',
    }
  }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f0f0f0' }}>
              <TableRow>
                <TableCell><strong>Subject</strong></TableCell>
                <TableCell><strong>Start Time</strong></TableCell>
                <TableCell><strong>End Time</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.Subject}</TableCell>
                  <TableCell>{row["Start Time"]}</TableCell>
                  <TableCell>{row["End Time"]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default FileUploader;
