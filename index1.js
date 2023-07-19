const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// change value to create Files

const startDateTime = "2023-07-18T18:15:00";
const endDateTime = "2023-07-18T18:30:00";

const year = startDateTime.substring(0, 4); // Extract the year component
const month = startDateTime.substring(5, 7); // Extract the month component (Note: Month index starts from 0)
const day = startDateTime.substring(8, 10); // Extract the day component

const hours = startDateTime.substring(11, 13);
const minutes = startDateTime.substring(14, 16);
const seconds = startDateTime.substring(17);

// Define column headers for Device_history
const deviceHistoryColumns = [
  "Time",
  "NOT_SCANNED",
  "OK",
  "SUSPICIOUS",
  "TIMEOUT",
  "Totals",
];

// Define column data ranges for Device_history
const deviceHistoryColumnRanges = {
  NOT_SCANNED: [0, 5],
  OK: [40, 250],
  SUSPICIOUS: [2, 40],
  TIMEOUT: [1, 15],
};

// Generate random data for each column in Device_history
function generateDeviceHistoryData() {
  const data = [];
  const date = new Date(startDateTime);

  for (let i = 0; i < 3; i++) {
    const time = formatDate(date);
    const row = { Time: time };

    for (const column of Object.keys(deviceHistoryColumnRanges)) {
      const [min, max] = deviceHistoryColumnRanges[column];
      const value = Math.floor(Math.random() * (max - min + 1)) + min;
      row[column] = value;
    }

    data.push(row);
    date.setMinutes(date.getMinutes() + 5);
  }

  // Calculate totals row-wise
  let notScannedTotal = 0;
  let okTotal = 0;
  let suspiciousTotal = 0;
  let timeoutTotal = 0;

  for (const row of data) {
    notScannedTotal += row.NOT_SCANNED;
    okTotal += row.OK;
    suspiciousTotal += row.SUSPICIOUS;
    timeoutTotal += row.TIMEOUT;

    // Add the calculated totals to each row
    row.Totals = row.NOT_SCANNED + row.OK + row.SUSPICIOUS + row.TIMEOUT;
  }

  // Add the final totals row
  const totals = {
    Time: "Totals",
    NOT_SCANNED: notScannedTotal,
    OK: okTotal,
    SUSPICIOUS: suspiciousTotal,
    TIMEOUT: timeoutTotal,
    Totals: notScannedTotal + okTotal + suspiciousTotal + timeoutTotal,
  };
  data.push(totals);

  return data;
}

// Format date as YYYY-MM-DDTHH:mm:ss
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Generate output folder paths
const deviceHistoryOutputFolder = "./output/Device_history";
const bagStatisticsOutputFolder = "./output/Bag_statistics";

// Create output folders if they don't exist
if (!fs.existsSync(deviceHistoryOutputFolder)) {
  fs.mkdirSync(deviceHistoryOutputFolder, { recursive: true });
}

if (!fs.existsSync(bagStatisticsOutputFolder)) {
  fs.mkdirSync(bagStatisticsOutputFolder, { recursive: true });
}

// Generate 13 Device_history files
for (let i = 1; i <= 13; i++) {
  const deviceHistoryData = generateDeviceHistoryData();

  // Create workbook for Device_history
  const deviceHistoryWorkbook = XLSX.utils.book_new();
  const deviceHistoryWorksheet = XLSX.utils.json_to_sheet(deviceHistoryData, {
    header: deviceHistoryColumns,
  });
  XLSX.utils.book_append_sheet(
    deviceHistoryWorkbook,
    deviceHistoryWorksheet,
    "Table"
  );

  // Generate Input sheet
  const inputSheetData = [
    ["Report:", "Device history"],
    ["", ""],
    ["Interval:", "15 minutes"],
    ["Units:", `ATRS-${String(i).padStart(2, "0")}_T2`],
    ["Period:", `${startDateTime} - ${endDateTime}`],
  ];
  const inputWorksheet = XLSX.utils.aoa_to_sheet(inputSheetData);
  XLSX.utils.book_append_sheet(deviceHistoryWorkbook, inputWorksheet, "Input");

  // Generate Info sheet
  const infoSheetData = [
    ["Element", "Value"],
    ["Minimum evaluation time", "0.0 s"],
    ["Maximum evaluation time", "20.0 s"],
    ["Average evaluation time", "2.2 s"],
  ];
  const infoWorksheet = XLSX.utils.aoa_to_sheet(infoSheetData);
  XLSX.utils.book_append_sheet(deviceHistoryWorkbook, infoWorksheet, "Info");

  // Generate filename for Device_history
  // const deviceHistoryFilename = `${selectedDate}-${i}-Device_history.xlsx`;
  const deviceHistoryFilename = `BOM-T2-${year}-${month}-${day}_${hours}-${minutes}-device_history_${i}.xlsx`;
  const deviceHistoryOutputPath = path.join(
    deviceHistoryOutputFolder,
    deviceHistoryFilename
  );

  // Save Device_history workbook to file
  XLSX.writeFile(deviceHistoryWorkbook, deviceHistoryOutputPath);
  console.log(
    `Device_history Excel file '${deviceHistoryOutputPath}' generated successfully.`
  );
}

// Generate Bag_statistics file
const bagStatisticsData = [];
const bagStatisticsColumns = [
  "Date/Time",
  ...Array.from(
    { length: 13 },
    (_, i) => `ATRS-${String(i + 1).padStart(2, "0")}_T2`
  ),
  ...Array.from(
    { length: 3 },
    (_, i) => `ATRS-${String(i + 14).padStart(2, "0")}_T1`
  ),
];

// Generate data for Bag_statistics
const startDate = new Date(startDateTime);

for (let i = 0; i < 3; i++) {
  const date = new Date(startDate);
  date.setMinutes(date.getMinutes() + i * 5);

  const time = formatDate(date);
  const row = [time];

  for (let j = 1; j <= 16; j++) {
    if (j <= 13) {
      const deviceHistoryFilename = `BOM-T2-${year}-${month}-${day}_${hours}-${minutes}-device_history_${j}.xlsx`;
      const deviceHistoryPath = path.join(
        deviceHistoryOutputFolder,
        deviceHistoryFilename
      );
      const deviceHistoryWorkbook = XLSX.readFile(deviceHistoryPath);
      const deviceHistoryWorksheet = deviceHistoryWorkbook.Sheets.Table;
      const deviceHistoryData = XLSX.utils.sheet_to_json(
        deviceHistoryWorksheet
      );
      const totalsColumn = deviceHistoryData.find(
        (row) => row.Time === time
      ).Totals;
      row.push(totalsColumn);
    } else {
      const randomValue = Math.floor(Math.random() * 301); // Random value from 0 to 300
      row.push(randomValue);
    }
  }

  bagStatisticsData.push(row);
}

// Calculate totals for each column
const totalsRow = ["Totals"];
const columnSums = Array(16).fill(0);

for (const row of bagStatisticsData) {
  for (let i = 1; i <= 16; i++) {
    columnSums[i - 1] += row[i];
  }
}

totalsRow.push(...columnSums);
bagStatisticsData.push(totalsRow);

// Create workbook for Bag_statistics
const bagStatisticsWorkbook = XLSX.utils.book_new();
const bagStatisticsWorksheet = XLSX.utils.aoa_to_sheet([
  bagStatisticsColumns,
  ...bagStatisticsData,
]);
XLSX.utils.book_append_sheet(
  bagStatisticsWorkbook,
  bagStatisticsWorksheet,
  "Table"
);

// Generate Input sheet
const inputSheetData = [
  ["Report:", "Bag statistics"],
  ["", ""],
  ["Interval:", "5 minutes"],
  [
    "Units:",
    `(GATE, ATRS-01_T2), (GATE, ATRS-02_T2), (GATE, ATRS-03_T2), (GATE, ATRS-04_T2), (GATE, ATRS-05_T2), (GATE, ATRS-06_T2), (GATE, ATRS-07_T2), (GATE, ...`,
  ],
  ["Period:", `${startDateTime} - ${endDateTime}`],
];
const inputWorksheet = XLSX.utils.aoa_to_sheet(inputSheetData);
XLSX.utils.book_append_sheet(bagStatisticsWorkbook, inputWorksheet, "Input");

// Generate filename for Bag_statistics
//const bagStatisticsFilename = `${selectedDate}-Bag_statistics.xlsx`;
const bagStatisticsFilename = `BOM-T2-${year}-${month}-${day}_${hours}-${minutes}-bag_statistics.xlsx`;
const bagStatisticsOutputPath = path.join(
  bagStatisticsOutputFolder,
  bagStatisticsFilename
);

// Save Bag_statistics workbook to file
XLSX.writeFile(bagStatisticsWorkbook, bagStatisticsOutputPath);
console.log(
  `Bag_statistics Excel file '${bagStatisticsOutputPath}' generated successfully.`
);

//  create System_overview file

// Generate output folder path
const systemOverviewOutputFolder = "./output/System_overview";

// Create output folder if it doesn't exist
if (!fs.existsSync(systemOverviewOutputFolder)) {
  fs.mkdirSync(systemOverviewOutputFolder, { recursive: true });
}

// Define column headers for Table sheet
const tableColumns = [
  "Unit",
  "NOT_SCANNED",
  "OK",
  "SUSPICIOUS",
  "TIMEOUT",
  "TIMEOUT_Analyst",
  "TIMEOUT_CIDA",
  "TIMEOUT_Recheck",
  "Totals",
];

// Define column data ranges for Table sheet
const tableColumnRanges = {
  NOT_SCANNED: [0, 60],
  OK: [40, 3504],
  SUSPICIOUS: [0, 836],
  TIMEOUT: [1, 155],
  TIMEOUT_Analyst: [0, 0],
  TIMEOUT_CIDA: [0, 0],
  TIMEOUT_Recheck: [0, 0],
};

// Define random unit names
// const unitNames = [
//   ...Array.from({ length: 31 }, (_, i) => `ANALYST-1-${i + 1}`),
//   ...Array.from(
//     { length: 13 },
//     (_, i) => `ATRS-${String(i + 1).padStart(2, "0")}_T2`
//   ),
//   ...Array.from(
//     { length: 3 },
//     (_, i) => `ATRS-${String(i + 14).padStart(2, "0")}_T1`
//   ),
//   "MSE-1-2",
//   ...Array.from({ length: 32 }, (_, i) => `RECHECK-1-${i + 1}`),
// ];

const unitNames = [
  "ANALYST-1-1",
  "ANALYST-1-10",
  "ANALYST-1-12",
  "ANALYST-1-13",
  "ANALYST-1-14",
  "ANALYST-1-16",
  "ANALYST-1-17",
  "ANALYST-1-18",
  "ANALYST-1-19",
  "ANALYST-1-20",
  "ANALYST-1-22",
  "ANALYST-1-23",
  "ANALYST-1-24",
  "ANALYST-1-26",
  "ANALYST-1-27",
  "ANALYST-1-30",
  "ANALYST-1-31",
  "ANALYST-1-4",
  "ANALYST-1-5",
  "ANALYST-1-6",
  "ANALYST-1-7",
  "ANALYST-1-9",
  "ATRS-01_T2",
  "ATRS-02_T2",
  "ATRS-03_T2",
  "ATRS-04_T2",
  "ATRS-05_T2",
  "ATRS-06_T2",
  "ATRS-07_T2",
  "ATRS-08_T2",
  "ATRS-09_T2",
  "ATRS-10_T2",
  "ATRS-11_T2",
  "ATRS-12_T2",
  "ATRS-13_T2",
  "ATRS-14_T1",
  "ATRS-15_T1",
  "ATRS-16_T1",
  "MSE-1-2",
  "RECHECK-1-1",
  "RECHECK-1-10",
  "RECHECK-1-11",
  "RECHECK-1-12",
  "RECHECK-1-13",
  "RECHECK-1-14",
  "RECHECK-1-15",
  "RECHECK-1-16",
  "RECHECK-1-17",
  "RECHECK-1-18",
  "RECHECK-1-19",
  "RECHECK-1-2",
  "RECHECK-1-20",
  "RECHECK-1-21",
  "RECHECK-1-22",
  "RECHECK-1-23",
  "RECHECK-1-24",
  "RECHECK-1-25",
  "RECHECK-1-26",
  "RECHECK-1-28",
  "RECHECK-1-29",
  "RECHECK-1-3",
  "RECHECK-1-32",
  "RECHECK-1-4",
  "RECHECK-1-5",
  "RECHECK-1-6",
  "RECHECK-1-7",
  "RECHECK-1-8",
  "RECHECK-1-9",
];

// Generate random data for each column in Table sheet
function generateTableData() {
  const data = [];

  for (let i = 0; i < unitNames.length; i++) {
    const row = {};

    for (const column of Object.keys(tableColumnRanges)) {
      const [min, max] = tableColumnRanges[column];
      const value = Math.floor(Math.random() * (max - min + 1)) + min;
      row[column] = value;
    }

    row.Unit = unitNames[i];
    data.push(row);
  }

  // Calculate totals for each row and add "Totals" column
  data.forEach((row) => {
    let rowTotal = 0;

    for (const column of Object.keys(tableColumnRanges)) {
      rowTotal += row[column];
    }

    row.Totals = rowTotal;
  });

  // Calculate column totals
  const columnTotals = {};

  for (const column of Object.keys(tableColumnRanges)) {
    const columnData = data.map((row) => row[column]);
    const columnSum = columnData.reduce((sum, value) => sum + value, 0);
    columnTotals[column] = columnSum;
  }

  // Create "Totals" row
  const totalsRow = { Unit: "Totals" };

  for (const column of Object.keys(tableColumnRanges)) {
    totalsRow[column] = columnTotals[column];
  }

  // Calculate sum of "Totals" column
  const totalsColumnSum = Object.values(columnTotals).reduce(
    (sum, value) => sum + value,
    0
  );
  totalsRow.Totals = totalsColumnSum;

  // Add "Totals" row at the end
  data.push(totalsRow);

  return data;
}

// Create workbook for System_overview
const systemOverviewWorkbook = XLSX.utils.book_new();

// Create Table sheet
const tableData = generateTableData();
const tableWorksheet = XLSX.utils.json_to_sheet(tableData, {
  header: tableColumns,
});
XLSX.utils.book_append_sheet(systemOverviewWorkbook, tableWorksheet, "Table");

// Create Input sheet
const inputSheetData1 = [
  ["Report:", "System overview"],
  ["", ""],
  ["Period:", `${startDateTime} - ${endDateTime}`],
];
const inputWorksheet1 = XLSX.utils.aoa_to_sheet(inputSheetData1);
XLSX.utils.book_append_sheet(systemOverviewWorkbook, inputWorksheet1, "Input");

// Generate filename for System_overview

// const systemOverviewFilename = "System_overview.xlsx";
const systemOverviewFilename = `BOM-T2-${year}-${month}-${day}_${hours}-${minutes}-system_overview.xlsx`;
const systemOverviewOutputPath = path.join(
  systemOverviewOutputFolder,
  systemOverviewFilename
);

// Save System_overview workbook to file
XLSX.writeFile(systemOverviewWorkbook, systemOverviewOutputPath);
console.log(
  `System_overview Excel file '${systemOverviewOutputPath}' generated successfully.`
);
