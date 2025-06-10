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
  TablePagination,
  Button,
    Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';

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
    const events = filtered.map(row => row.Event);
    const fuse = new Fuse(events, { includeScore: true, threshold: 0.2 });
    const groups = {};

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
    label: formatTimespan(minDate, maxDate)
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
    </Box>
    );
  }
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
        <TableContainer component={Paper} sx={{ overflowX: 'auto', maxWidth: '100%', width: '100%' }}>
          <Typography variant="h6" gutterBottom>
      <Paper elevation={0} style={{ padding: '1rem', marginTop: '1rem', textAlign: 'left' }}>
      <Typography variant="h6" gutterBottom>
        Meeting Summary
      </Typography>
      <Typography variant="body1">
        🗓 <strong>Job title:</strong> {role}
      </Typography>
            <Typography variant="body1">
        🗓 <strong>Per hour cost:</strong> {costPerHour}
      </Typography>
      <Typography variant="body1">
        🗓 <strong>Timespan:</strong> {timespan.label}
      </Typography>
      <Typography variant="body1">
        ⏱ <strong>Total Hours:</strong> {totalHours.toFixed(1)}
      </Typography>
      <Typography variant="body1">
        💶 <strong>Total Cost:</strong> €{totalCost.toFixed(2)}
      </Typography>
    </Paper>
          </Typography>
<>
      <TableContainer>
        <Table>
          <TableHead sx={{ backgroundColor: '#f0f0f0' }}>
            <TableRow>
              <TableCell><strong>Hours</strong></TableCell>
              <TableCell><strong>Event</strong></TableCell>
              <TableCell><strong>Times Occurred</strong></TableCell>
              <TableCell><strong>Cost</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetingSummary
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row["TotalHours"]}</TableCell>
                  <TableCell>{row["Event"]}</TableCell>
                  <TableCell>{row["Count"]}</TableCell>
                  <TableCell>{(row["TotalHours"] * 50).toFixed(2)} €</TableCell>
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
      />
</>
        <Button variant="contained" onClick={()=>{
          const prompt = `You're a productivity consultant.\n\nUser uploaded meeting data ${timespan}.\n- Cost/hour: €${costPerHour}\n- Company size: 220\n- this is 1 persons calender with role of ${role}\n- 7 team lead reports\n- Cleaned: removed Lunch, Annual Leave, Cancelled, and empty\n- Grouped similar names\n\nSummary Table:\n| Event Name | Cost (€) |\n|------------|-----------|\n${meetingSummary.map(row => `| ${row.Event} | ${(row.TotalHours * costPerHour).toFixed(2)} € |`).join('\n')}\n\nPlease:\n1. Benchmark this meeting load\n2. Identify any excessive costs\n3. Recommend how to reduce meeting time/cost. compare to industry standards.`;
          sendToOpenAI(prompt); 
        }} sx={{ mt: 2 }}>
         Analyze with AI
        </Button>
        </TableContainer>



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
