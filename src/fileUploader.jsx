// React + OpenAI (no backend): Meeting Analyzer Tool
// npm install openai papaparse fuse.js react-dropzone @mui/material

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

import { format, formatDistance, formatDistanceToNow } from "date-fns";

const HOURLY_RATES = {
  "Software Engineer": 70,
  "Product Manager": 40,
  QA: 30,
  DevOps: 60,
};

const MeetingAnalyzer = () => {
  const [filteredData, setFilteredData] = useState([]);
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryPresentation, setSummaryPresentation] = useState("file");
  const [role, setRole] = useState("Software Engineer");
  const costPerHour = HOURLY_RATES[role];
  const [page] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [topAttendees, setTopAttendees] = useState([]);
  const [topOneOnOne, setTopOneOnOne] = useState([]);

  const sendToOpenAI = async (prompt) => {
    setLoading(true);
    setSummaryPresentation("analyis");
    setAiResponse("");
    try {
      console.log("Sending prompt to OpenAI:", prompt);
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer `,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              { role: "system", content: "You are a productivity analyst." },
              { role: "user", content: prompt },
            ],
          }),
        }
      );
      const data = await response.json();
      setAiResponse(data.choices[0].message.content);
    } catch (error) {
      setAiResponse("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isValidEvent = (eventName = "") => {
    const lower = eventName.toLowerCase();
    return (
      lower &&
      !lower.includes("lunch") &&
      !lower.includes("annual leave") &&
      !lower.includes("canceled") &&
      !lower.includes("cancelled") // just in case
    );
  };

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      return;
    }
    setLoading(true);
    const file = acceptedFiles[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;

        const filtered = data
          .map((row) => ({
            "Start Date": row["Start Date"] || "",
            Event: row["Subject"] || "",
            "Start Time": `${row["Start Date"]} ${row["Start Time"]}`.trim(),
            "End Time": `${row["End Date"]} ${row["End Time"]}`.trim(),
            "Required Attendees": `${row["Required Attendees"]}`.trim() || "",
          }))
          .filter((row) => isValidEvent(row.Event));

        setFilteredData(filtered);
        processData(filtered);
        setLoading(false);
        setSummaryPresentation("table"); // Set to table view after processing
      },
    });
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    noClick: true,
    noKeyboard: true,
  });

  const processData = (filtered) => {
    if (!filtered || filtered.length === 0) {
      console.error("No valid data to process.");
      return;
    }

    if (!filtered || filtered.length === 0) return;

    // Helper to parse the date
    const parseDate = (dateStr) => {
      const [day, month, yearAndTime] = dateStr.split("/");
      const [year, time] = yearAndTime.split(" ");
      const [hour, minute, second] = time.split(":").map(Number);
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour,
        minute,
        second
      );
    };

    // Filter out future events
    const today = new Date();
    filtered = filtered.filter((row) => {
      const startDate = parseDate(row["Start Time"]);
      return startDate <= today;
    });

    // Count top attendees across all meetings
    const attendeeCount = {};

    for (const row of filtered) {
      const attendees = row["Required Attendees"]
        ?.split(";")
        .map((name) => name.trim())
        .filter(Boolean);

      attendees.forEach((person) => {
        attendeeCount[person] = (attendeeCount[person] || 0) + 1;
      });
    }

    const top = Object.entries(attendeeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(1, 4)
      .map(([name, count]) => ({ name, count }));

    setTopAttendees(top);

    // Most frequent 1:1 person logic
    const oneOnOneCount = {};
    for (const row of filtered) {
      const attendees = row["Required Attendees"]
        ?.split(";")
        .map((name) => name.trim())
        .filter(Boolean);

      if (attendees.length === 2) {
        // Find the other person (excluding yourself)
        attendees.forEach((person) => {
          if (
            !person.toLowerCase().includes("michael") &&
            !person.toLowerCase().includes("mj")
          ) {
            oneOnOneCount[person] = (oneOnOneCount[person] || 0) + 1;
          }
        });
      }
    }

    const topOneOnOne = Object.entries(oneOnOneCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([name, count]) => ({ name, count }));

    setTopOneOnOne(topOneOnOne);

    const fullTable = `\nFull Cost Breakdown:\n| Event | Hours | Count | Cost (€) | Required Attendees |\n${meetingSummary
      .map((row) => {
        // Find the first matching event in filtered to get Required Attendees
        const attendee =
          filtered.find((item) => item.Event === row.Event)?.[
            "Required Attendees"
          ] || "";
        return `| ${row.Event} | ${row.TotalHours} | ${row.Count} | ${(
          row.TotalHours * costPerHour
        ).toFixed(2)} € | ${attendee} |`;
      })
      .join("\n")}`;

    const prompt = `\n${fullTable}\n\nPlease analyze...`;

    console.log("Prompt sent to OpenAI:", prompt);
  };

  function summarizeMeetings(eventsArray) {
    if (!Array.isArray(eventsArray) || eventsArray.length === 0) {
      return [];
    }

    function parseDate(dateStr) {
      const [day, month, yearAndTime] = dateStr.split("/");
      const [year, time] = yearAndTime.split(" ");
      const [hour, minute, second] = time.split(":").map(Number);

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour,
        minute,
        second
      );
    }

    const summaryMap = {};
    for (const meeting of eventsArray) {
      const event = meeting.Event;
      const requiredAttendees = meeting["Required Attendees"] || "";
      const start = parseDate(meeting["Start Time"]);
      const end = parseDate(meeting["End Time"]);

      const durationHours = (end - start) / (1000 * 60 * 60);

      if (!summaryMap[event]) {
        summaryMap[event] = {
          count: 0,
          totalHours: 0,
          requiredAttendees: requiredAttendees,
        };
      }

      summaryMap[event].count += 1;
      summaryMap[event].totalHours += durationHours;
      summaryMap[event].requiredAttendees = requiredAttendees;
    }

    // Convert to sorted array
    const summaryArray = Object.entries(summaryMap)
      .map(([event, data]) => ({
        Event: event,
        Count: data.count,
        TotalHours: Number(data.totalHours.toFixed(1)),
        RequiredAttendees: data.requiredAttendees,
      }))
      .sort((a, b) => b.Count - a.Count); // sort by count descending

    return summaryArray;
  }

  function getTotalHours(summaryArray) {
    return summaryArray.reduce((sum, item) => sum + item.TotalHours, 0);
  }

  function getEventTimespan(eventsArray) {
    function parseDate(dateStr) {
      const [day, month, yearAndTime] = dateStr.split("/");
      const [year, time] = yearAndTime.split(" ");
      const [hour, minute, second] = time.split(":").map(Number);
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour,
        minute,
        second
      );
    }

    const today = new Date();

    // Filter out future events
    const pastEvents = eventsArray.filter((event) => {
      const date = parseDate(event["Start Time"]);
      return date <= today;
    });

    if (pastEvents.length === 0) {
      return null;
    }

    let minDate = parseDate(pastEvents[0]["Start Time"]);
    let maxDate = minDate;

    for (const event of pastEvents) {
      const date = parseDate(event["Start Time"]);
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
    }

    return {
      firstEvent: minDate,
      lastEvent: maxDate,
      label: `From ${format(minDate, "d MMM yyyy")} to ${format(
        maxDate,
        "d MMM yyyy"
      )}`,
      distanceLabel: `From ${formatDistanceToNow(minDate, {
        addSuffix: true,
      })} to ${formatDistanceToNow(maxDate, { addSuffix: true })}`,
      rangeGap: formatDistance(minDate, maxDate),
    };
  }

  const meetingSummary = summarizeMeetings(filteredData);
  const totalHours = getTotalHours(meetingSummary);
  const totalCost = totalHours * costPerHour; // €50/hour
  const timespan = getEventTimespan(filteredData);
  const sortedSummary = [...meetingSummary].sort(
    (a, b) => b.TotalHours * costPerHour - a.TotalHours * costPerHour
  );

  function getFileBox() {
    if (summaryPresentation === "file") {
      return (
        <Box sx={{ p: 4 }}>
          <Box
            {...getRootProps()}
            sx={{
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: "transparent",
              mb: 4,
            }}
          >
            <input {...getInputProps()} />
            <Button
              style={{ backgroundColor: "#a855f7" }}
              variant="contained"
              onClick={open}
              sx={{ mt: 2 }}
            >
              Select File
            </Button>
          </Box>
        </Box>
      );
    }
  }

  function formatEuro(amount) {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function getJobTitleOptions() {
    if (summaryPresentation !== "table") {
      return null;
    }

    return (
      <FormControl fullWidth sx={{ mb: 2, maxWidth: "300px" }}>
        <InputLabel
          id="role-label"
          sx={{
            color: "#fff",
            "&.Mui-focused": { color: "#a855f7" },
          }}
        >
          Role
        </InputLabel>
        <Select
          labelId="role-label"
          value={role}
          label="Role"
          onChange={(e) => {
            setRole(e.target.value);
            console.log("Selected role:", e.target.value);

            if (filteredData || filteredData.length > 0) {
              summarizeMeetings(filteredData); // Recalculate summary with new role
              setSummaryPresentation("table"); // Ensure table view is shown
            }
          }}
          sx={{
            backgroundColor: "#111827",
            color: "#fff",
            ".MuiOutlinedInput-notchedOutline": {
              borderColor: "#a855f7",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#a855f7",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#a855f7",
            },
            ".MuiSvgIcon-root": {
              color: "#fff",
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: "#111827",
                color: "#fff",
              },
            },
          }}
        >
          {Object.keys(HOURLY_RATES).map((title) => (
            <MenuItem
              key={title}
              value={title}
              sx={{
                backgroundColor: "#111827",
                color: "#fff",
                "&.Mui-selected": {
                  backgroundColor: "#a855f7",
                  color: "#fff",
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "#9333ea",
                },
              }}
            >
              {title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  if (loading) {
    return <CircularProgress color="secondary" size="5rem" />;
  }

  console.log(meetingSummary, "xxxxxxxxxx");
  return (
    <>
      {getJobTitleOptions()}

      {getFileBox()}

      {meetingSummary.length > 0 && summaryPresentation === "table" && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                sm: "repeat(2, 1fr)", // 1 column on mobile
                md: "repeat(2, 1fr)", // 3 equal columns on desktop
              },
              gap: 2, // spacing between items (theme spacing)
              my: 2,
              marginBottom: "3rem",
            }}
          >
            <Paper
              sx={{
                p: 2,
                backgroundColor: "rgb(21,28,50)",
                color: "#fff",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h4"
                sx={{ fontWeight: "bolder", color: "rgb(59 130 246)" }}
              >
                {formatEuro(totalCost)}
              </Typography>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ color: "rgb(209 213 219)", fontWeight: "bolder" }}
              >
                Total Cost
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                backgroundColor: "rgb(21,28,50)",
                color: "#fff",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h4"
                sx={{ fontWeight: "bolder", color: "rgb(59 130 246)" }}
              >
                {totalHours.toFixed(1)} hours
              </Typography>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ color: "rgb(209 213 219)", fontWeight: "bolder" }}
              >
                Total Hours
              </Typography>
            </Paper>
            {topAttendees.length > 0 && (
              <Box
                sx={{
                  mt: 4,
                  backgroundColor: "rgb(21,28,50)",
                  color: "#fff",
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ color: "#60a5fa", fontWeight: "bold", mb: 1 }}
                >
                  Top 3 Meeting Attendees
                </Typography>
                {topAttendees.map(({ name, count }) => (
                  <Typography variant="body2">
                    {name} — {count} meetings
                  </Typography>
                ))}
              </Box>
            )}
            {topOneOnOne.length > 0 && (
              <Box
                sx={{
                  mt: 4,
                  backgroundColor: "rgb(21,28,50)",
                  color: "#fff",
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ color: "#60a5fa", fontWeight: "bold", mb: 1 }}
                >
                  Most Frequent 1:1 Meeting
                </Typography>
                <Typography variant="body2">
                  {topOneOnOne[0].name} — {topOneOnOne[0].count} times
                </Typography>
              </Box>
            )}
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
          <Typography
            variant="h5"
            gutterBottom
            sx={{ color: "#fff ", fontWeight: "bold", textAlign: "left" }}
          >
            Meeting Summary
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: "bolder",
              color: "rgb(209 213 219)",
              textAlign: "left",
            }}
          >
            {timespan?.distanceLabel || "N/A"}
          </Typography>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <Button
              style={{ backgroundColor: "#a855f7" }}
              endIcon={<SendIcon />}
              variant="contained"
              onClick={() => {
                const prompt = `You're a productivity consultant.\n\nUser uploaded meeting data ${timespan}.\n- Cost/hour: €${costPerHour}\n- Company size: 220\n- this is 1 persons calender with role of ${role}\n- 7 team lead reports\n- Cleaned: removed Lunch, Annual Leave, Cancelled, and empty\n- Grouped similar names\n\nSummary Table:\n| Event Name | Cost (€) |\n|------------|-----------|\n${meetingSummary
                  .map(
                    (row) =>
                      `| ${row.Event} | ${(
                        row.TotalHours * costPerHour
                      ).toFixed(2)} € |`
                  )
                  .join(
                    "\n"
                  )}\n\nPlease:\n1. Benchmark this meeting load\n2. Identify any excessive costs\n3. Recommend how to reduce meeting time/cost. compare to industry standards.`;
                sendToOpenAI(prompt);
              }}
              sx={{ mt: 2 }}
            >
              Smart Analysis
            </Button>
          </div>
          <>
            <Box
              container
              spacing={2}
              sx={{
                marginTop: "2rem",
                marginBottom: "1rem",
                display: "grid",
                gridTemplateColumns: {
                  sm: "repeat(2, 1fr)", // 1 column on mobile
                  md: "repeat(2, 1fr)", // 3 equal columns on desktop
                },
                gap: 2, // spacing between items (theme spacing)
                my: 2,
                // eslint-disable-next-line no-dupe-keys
                marginBottom: "3rem",
              }}
            >
              {sortedSummary !== null &&
                sortedSummary.length > 0 &&
                sortedSummary
                  .slice(0, (page + 1) * rowsPerPage)
                  .map((row, index) => (
                    <Grid item xs={12} md={5} lg={4} key={index}>
                      <Paper
                        sx={{
                          p: 2,
                          backgroundColor: "rgb(31 41 55 / 0.5)",
                          color: "#fff",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ color: "rgb(6 182 212)", fontWeight: "bolder" }}
                        >
                          {formatEuro(row["TotalHours"] * costPerHour)}
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{ color: "#fff", fontWeight: "bold" }}
                        >
                          {row["Event"].substring(0, 30)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "rgb(209 213 219)" }}
                        >
                          {row["TotalHours"]} hrs &nbsp;|&nbsp; {row["Count"]}{" "}
                          times
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
            </Box>

            <Button
              variant="outlined"
              sx={{ mt: 2, mb: 2, color: "#fff", borderColor: "#fff" }}
              onClick={() => setRowsPerPage(rowsPerPage + 10000)}
              disabled={(page + 1) * rowsPerPage >= meetingSummary.length}
            >
              Show All
            </Button>
          </>
        </>
      )}

      {loading && <Typography>Analyzing your meeting data...</Typography>}
      {aiResponse && (
        <Box className="bg-white shadow-md p-4 border rounded" mt={4}>
          <Typography variant="h6" gutterBottom>
            AI Recommendations:
          </Typography>
          <Typography variant="body2" style={{ whiteSpace: "pre-line" }}>
            {aiResponse}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default MeetingAnalyzer;
