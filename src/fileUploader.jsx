// React + OpenAI (no backend): Meeting Analyzer Tool
// npm install openai papaparse fuse.js react-dropzone @mui/material

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import Fuse from 'fuse.js';
import CircularProgress from '@mui/material/CircularProgress';
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
    Select,
  MenuItem,
  TablePagination,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

import { format, formatDistance, formatDistanceToNow } from 'date-fns';

const HOURLY_RATES = {
  'Software Engineer': 70,
  'Product Manager': 40,
  'QA': 30,
  'DevOps': 60
};


const MeetingAnalyzer = () => {
  const [filteredData, setFilteredData] = useState([]);
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryPresentation, setSummaryPresentation] = useState('file');
   const [role, setRole] = useState('Software Engineer');
  const costPerHour = HOURLY_RATES[role];
      const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  const sendToOpenAI = async (prompt) => {
    setLoading(true);
    setSummaryPresentation('analyis'); // Switch to AI analysis view
    setAiResponse(''); // Clear previous response
    try {
      console.log("Sending prompt to OpenAI:", prompt);
      // Uncomment the following lines to enable OpenAI API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer `,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a productivity analyst.' },
            { role: 'user', content: prompt },
          ],
        })
      });
      const data = await response.json();
      setAiResponse(data.choices[0].message.content);
    } catch (error) {
      setAiResponse('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (acceptedFiles) => {

    if (acceptedFiles.length === 0) {
      return;
    }
    setLoading(true)
    const file = acceptedFiles[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;

        const filtered = data.map(row => ({
          Event: row["Subject"] || '',
          "Start Time": `${row["Start Date"]} ${row["Start Time"]}`.trim(),
          "End Time": `${row["End Date"]} ${row["End Time"]}`.trim(),
        })).filter(row => {
          const event = row.Event.toLowerCase().trim();
          return event && !event.includes('lunch') && !event.includes('annual leave') && !event.includes('cancelled');
        });

        setFilteredData(filtered);
        processData(filtered);
        setLoading(false);
        setSummaryPresentation('table'); // Set to table view after processing
      }
    });
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    noClick: true,
    noKeyboard: true
  });

  const processData = (filtered) => {
  if (!filtered || filtered.length === 0) {
      console.error("No valid data to process.");
      return;
    }
console.log("Processing data...", meetingSummary);

const fullTable =    `\nFull Cost Breakdown:\n| Event | Hours | Count | Cost (€) |\n${meetingSummary.map(row => `| ${row.Event} | ${row.TotalHours} | ${row.Count} | ${(row.TotalHours * costPerHour).toFixed(2)} € |`).join('\n')}`


const prompt = `\n${fullTable}\n\nPlease analyze...`
  //const prompt = `You're a productivity consultant.\n\nUser uploaded meeting data (May 2025).\n- Cost/hour: €50\n- Company size: 220\n- 7 team lead reports\n- Cleaned: removed Lunch, Annual Leave, Cancelled, and empty\n- Grouped similar names\n\nSummary Table:\n| Event Name | Cost (€) |\n|------------|-----------|\n${meetingSummary}\n\nPlease:\n1. Benchmark this meeting load\n2. Identify any excessive costs\n3. Recommend how to reduce meeting time/cost.`;
   // console.log(prompt);


 console.log("Prompt sent to OpenAI:", prompt);
  };

function summarizeMeetings(eventsArray) {

  if(!Array.isArray(eventsArray) || eventsArray.length === 0) {
    return [];  
  }

  function parseDate(dateStr) {
    const [day, month, yearAndTime] = dateStr.split('/');
    const [year, time] = yearAndTime.split(' ');
    const [hour, minute, second] = time.split(':').map(Number);
    
    return new Date(Number(year), Number(month) - 1, Number(day), hour, minute, second);
  }

  const summaryMap = {};

  for (const meeting of eventsArray) {
    const event = meeting.Event;
    const start = parseDate(meeting["Start Time"]);
    const end = parseDate(meeting["End Time"]);



    const durationHours = (end - start) / (1000 * 60 * 60);

    if (!summaryMap[event]) {
      summaryMap[event] = {
        count: 0,
        totalHours: 0
      };
    }

    summaryMap[event].count += 1;
    summaryMap[event].totalHours += durationHours;
  }

  // Convert to sorted array
  const summaryArray = Object.entries(summaryMap)
    .map(([event, data]) => ({
      Event: event,
      Count: data.count,
      TotalHours: Number(data.totalHours.toFixed(1)) // round to 1 decimal
    }))
    .sort((a, b) => b.Count - a.Count); // sort by count descending

  return summaryArray;
}

function getTotalHours(summaryArray) {
  return summaryArray.reduce((sum, item) => sum + item.TotalHours, 0);
}


function getEventTimespan(eventsArray) {
  function parseDate(dateStr) {
    const [day, month, yearAndTime] = dateStr.split('/');
    const [year, time] = yearAndTime.split(' ');
    const [hour, minute, second] = time.split(':').map(Number);
    return new Date(Number(year), Number(month) - 1, Number(day), hour, minute, second);
  }

  if (eventsArray.length === 0) {
    return null;
  }

  let minDate = parseDate(eventsArray[0]["Start Time"]);
  let maxDate = minDate;

  for (const event of eventsArray) {
    const date = parseDate(event["Start Time"]);
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;
  }

  return {
    firstEvent: minDate,
    lastEvent: maxDate,
    label: `From ${format(minDate, 'd MMM yyyy')} to ${format(maxDate, 'd MMM yyyy')}`,
    distanceLabel: `From ${formatDistanceToNow(minDate, { addSuffix: true })} to ${formatDistanceToNow(maxDate, { addSuffix: true })}`,
    rangeGap: formatDistance(minDate, maxDate)
  };
}

function formatTimespan(start, end) {
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  return `${formatter.format(start)} to ${formatter.format(end)}`;
}

const meetingSummary = summarizeMeetings(filteredData);
const totalHours = getTotalHours(meetingSummary);
const totalCost = totalHours * costPerHour; // €50/hour
const timespan = getEventTimespan(filteredData);

function getFileBox() {

  if(summaryPresentation === "file") {
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
          backgroundColor: 'transparent',
          mb: 4
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="h6" gutterBottom  sx={{ color: '#fff' }}>
          Drag and drop a CSV file here
        </Typography>
        <Typography variant="body2" color="primary"  sx={{ color: '#fff' }}>
          or
        </Typography>
        <Button variant="contained" onClick={open} sx={{ mt: 2 }}>
          Select File
        </Button>
      </Box>
    </Box>
    );
  }
}

function formatEuro(amount) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function getJobTitleOptions() { 


if(summaryPresentation !== "file") {
  return null; // Don't show role selection if not in file view
} 

return   <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="role-label">Role</InputLabel>
        <Select
          labelId="role-label"
          value={role}
          label="Role"
          onChange={(e)=>{
            setRole(e.target.value);
            console.log("Selected role:", e.target.value);
            summarizeMeetings(filteredData); // Recalculate summary with new role
            setSummaryPresentation('table'); // Ensure table view is shown
          }}
        >
          {Object.keys(HOURLY_RATES).map((title) => (
            <MenuItem key={title} value={title}>
              {title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
}

  
  if(loading) {
    return <CircularProgress color="secondary" size="5rem" />
  }

console.log(meetingSummary, totalHours, totalCost);
  return (

<>

{getJobTitleOptions()}
  
{getFileBox()}


      {meetingSummary.length > 0 && summaryPresentation === "table" && (
        <>
      
<Box
  sx={{
    display: 'grid',
    gridTemplateColumns: {
      sm: '1fr',        // 1 column on mobile
      md: 'repeat(2, 1fr)' // 3 equal columns on desktop
    },
    gap: 2, // spacing between items (theme spacing)
    my: 2,
    marginBottom: '3rem',
  }}
>
  <Paper sx={{ p: 2, backgroundColor: 'rgb(21,28,50)', color: '#fff', borderRadius: 2 }}>
    <Typography variant="h4" sx={{ fontWeight: 'bolder' , color: 'rgb(59 130 246)' }}>
      {formatEuro(totalCost)}
    </Typography>
   <Typography variant="subtitle1" gutterBottom sx={{  color: 'rgb(209 213 219)' , fontWeight: 'bolder'}}>
      Total Cost
    </Typography>

  </Paper>

  <Paper sx={{ p: 2, backgroundColor: 'rgb(21,28,50)', color: '#fff', borderRadius: 2 }}>
    <Typography variant="h4" sx={{ fontWeight: 'bolder' , color: 'rgb(59 130 246)' }}>
      {totalHours.toFixed(1)} hours
    </Typography>
    <Typography variant="subtitle1" gutterBottom sx={{  color: 'rgb(209 213 219)', fontWeight: 'bolder' }}>
      Total Hours
    </Typography>

  </Paper>
{/* 
  <Paper sx={{ p: 2, backgroundColor: 'rgb(21,28,50)', color: '#fff', borderRadius: 2 }}>
    <Typography variant="h4" sx={{ fontWeight: 'bolder' , color: 'rgb(59 130 246)' }}>
      {timespan?.distanceLabel || 'N/A'}
    </Typography>
   <Typography variant="h6" gutterBottom sx={{  color: 'rgb(209 213 219)' }}>
      Timespan
    </Typography>

  </Paper> */}
</Box>
      <Typography variant="h5"  gutterBottom  sx={{ color: '#fff ', fontWeight: 'bold', textAlign:'left' }}>
        Meeting Summary
      </Typography>
       <Typography variant="body2" sx={{ fontWeight: 'bolder' ,  color: 'rgb(209 213 219)', textAlign:'left' }}>
      {timespan?.distanceLabel || 'N/A'}
    </Typography>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Button endIcon={<SendIcon />} variant="contained" onClick={()=>{
          const prompt = `You're a productivity consultant.\n\nUser uploaded meeting data ${timespan}.\n- Cost/hour: €${costPerHour}\n- Company size: 220\n- this is 1 persons calender with role of ${role}\n- 7 team lead reports\n- Cleaned: removed Lunch, Annual Leave, Cancelled, and empty\n- Grouped similar names\n\nSummary Table:\n| Event Name | Cost (€) |\n|------------|-----------|\n${meetingSummary.map(row => `| ${row.Event} | ${(row.TotalHours * costPerHour).toFixed(2)} € |`).join('\n')}\n\nPlease:\n1. Benchmark this meeting load\n2. Identify any excessive costs\n3. Recommend how to reduce meeting time/cost. compare to industry standards.`;
          sendToOpenAI(prompt); 
        }} sx={{ mt: 2 }}>
         Smart Analysis
        </Button></div>
<>
      <TableContainer sx={{ backgroundColor: 'rgb(31 41 55 / 0.5)', borderRadius: 2, marginBottom: '1rem', marginTop: '2rem', padding :  2 }} component={Paper }>
        <Table sx={{ backgroundColor: 'transparent' }}>
          <TableHead sx={{ backgroundColor: 'transparent' }}>
            <TableRow>
              <TableCell  sx={{color: '#fff'}}><strong>Hrs</strong></TableCell>
              <TableCell  sx={{color: '#fff'}}><strong>Event</strong></TableCell>
              <TableCell  sx={{color: '#fff'}}><strong>Count</strong></TableCell>
              <TableCell  sx={{color: '#fff'}}><strong>Cost</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ backgroundColor: 'transparent' }}>
            {meetingSummary
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => (
                <TableRow key={index} sx={{ backgroundColor: 'transparent', color: '#fff' }}>
                  <TableCell sx={{color: '#fff'}}>{row["TotalHours"]}</TableCell>
                  <TableCell  sx={{color: '#fff'}}>{row["Event"].substring(0,20)}</TableCell>
                  <TableCell  sx={{color: '#fff'}}>{row["Count"]}</TableCell>
                  
                  <TableCell  sx={{ color: 'rgb(6 182 212)', fontWeight: 'bolder'}}>{     formatEuro(row["TotalHours"] * 50)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
<TablePagination
  rowsPerPageOptions={[5, 10, 25]}
  component="div"
  count={meetingSummary.length}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={handleChangePage}
  onRowsPerPageChange={handleChangeRowsPerPage}
  sx={{
    color: '#fff', // general text
    '& .MuiTablePagination-toolbar': {
      color: '#fff',
    },
    '& .MuiTablePagination-selectLabel': {
      color: '#fff',
    },
    '& .MuiTablePagination-input': {
      color: '#fff',
    },
    '& .MuiSelect-icon': {
      color: '#fff',
    },
    '& .MuiSvgIcon-root': {
      color: '#fff',
    },
    '& .MuiTablePagination-actions button': {
      color: '#fff',
    },
  }}
/>

</>

        </>



      )}

      {loading && <Typography>Analyzing your meeting data...</Typography>}
      {aiResponse && (
        <Box className="bg-white shadow-md p-4 border rounded" mt={4}>
          <Typography variant="h6" gutterBottom>AI Recommendations:</Typography>
          <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>{aiResponse}</Typography>
        </Box>
      )}

</>

  );
};

export default MeetingAnalyzer;
