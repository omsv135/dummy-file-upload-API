// Constants
const FILE_UPLOAD_FIELD_NAME = "upload_file";

// Inporting required packages in constants
const express = require("express");
const request = require("request");
const body_parser = require("body-parser");
const path = require("node:path");
const fs = require("fs");
const cors = require("cors");

const multer = require("multer");
// Inistialise multer for single file upload
var upload = multer({ dest: ".data/" }).single(FILE_UPLOAD_FIELD_NAME);

// importing custom objects
const { ProcessesHandler } = require("./utils/process.js");
var processHandler = new ProcessesHandler();

const {
  INITIALISED,
  RUNNING,
  COMPLETED,
} = require("./utils/stateConstants.js");

const {
  ExceededProcessesLimitError,
  ProcessNotFoundError,
  ProcessExecutedError,
  ProcessNotCompletedError,
  ProcessNotRunningError,
} = require("./utils/processErrors.js");

// Initialising application
const app = express();

// Adding Middlewares on all routes
app.use(cors({
  origin: true,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.static("public"));
app.use(body_parser.urlencoded());

// Adding middlewares on specific routes
app.use("/uploadfile", upload);


// Defining routes
// app.options('*', cors());

app.get("/", (req, res) => {
  res.set("Content-Type", "text/html");
  return res.sendFile(__dirname + "/public/index.html");
});

app.post("/uploadfile", async (req, res) => {
  if (req.is("multipart/form-data") === null) {
    return res.status(400).send({
      success: false,
      error: "No body was sent in the request.",
    });
  }

  if (req.is("multipart/form-data") === false) {
    return res.status(400).send({
      success: false,
      error: "The body was not of the type multipart/form-data.",
    });
  }

  if (!req.file) {
    return res.status(500).send({
      success: false,
      error:
        "There was some error in parsing the file. please try again or contact server admin.",
    });
  }

  try {
    processHandler.addProcess(req.file.filename, req.file.originalname);
  } catch (err) {
    if (err instanceof ExceededProcessesLimitError) {
      return res.status(500).send({
        status: false,
        message: err.message,
      });
    }

    return internalError(err, res);
  }

  return res.status(200).send({
    status: true,
    data: {
      fileId: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

app.post("/startexecution", async (req, res) => {
  let time = undefined;
  if (req.body && req.body.time) {
    try {
      time = parseInt(req.body.time);
    } catch (err) {
      console.log(err);
      return res.status(400).send({
        success: false,
        error: "'time' should be an integer.",
      });
    }
  }

  const fileId = getFileId(req, res);
  if (fileId === null) {
    return;
  }

  try {
    processHandler.startExecution(fileId, time);
  } catch (err) {
    if (isProcNotFoundError(err, res)) {
      return;
    }

    if (isProcExecutedError(err, res)) {
      return;
    }

    return internalError(err, res);
  }

  res.status(200).send({
    success: true,
    fileId: fileId,
    message: `The process with fileId '${fileId}' has been initiated`,
  });
});

app.post("/checkstatus", async (req, res) => {
  const fileId = getFileId(req, res);
  if (fileId === null) {
    return;
  }

  let progress = null;
  try {
    progress = processHandler.getProgress(fileId);
  } catch (err) {
    if (isProcNotFoundError(err, res)) {
      return;
    }
    if (isProcNotRunningError(err, res)) {
      return;
    }

    return internalError(err, res);
  }

  return res.status(200).send({
    success: true,
    fileId: fileId,
    progress: progress,
  });
});

app.post("/viewresults", async (req, res) => {
  const fileId = getFileId(req, res);
  if (fileId === null) {
    return;
  }

  let result = null;
  try {
    result = processHandler.viewResults(fileId);
  } catch (err) {
    if (isProcNotFoundError(err, res)) {
      return;
    }
    if (isProcNotCompletedError(err, res)) {
      return;
    }

    return internalError(err, res);
  }

  return res.status(200).send({
    success: true,
    fileId: fileId,
    data: result,
  });
});

app.post("/downloadresults", async (req, res) => {
  const fileId = getFileId(req, res);
  if (fileId === null) {
    return;
  }

  let result = null;
  try {
    result = processHandler.getResult(fileId);
  } catch (err) {
    if (isProcNotFoundError(err, res)) {
      return;
    }
    if (isProcNotCompletedError(err, res)) {
      return;
    }

    return internalError(err, res);
  }

  res.setHeader("content-disposition", "attachment; filename=" + result);

  let filePath = path.resolve(__dirname, ".data/", result);

  res.status(200).download(filePath, (err) => {
    if (err) {
      console.log(
        "Error in /downloadresults enpoint in the res.download function."
      );
      throw err;
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        console.log("Error in /downloadresults enpoint while removing the file using fs.unlink");
        throw err;
      }
    });
  });
});

app.listen(process.env.PORT, () => {
  console.log(`The API is listening at ${process.env.PORT}`);
});

// Helper functions
function getFileId(req, res) {
  let fileId = null;
  if (req.body && req.body.fileId) {
    fileId = req.body.fileId;
  } else {
    res.status(400).send({
      success: false,
      error: "Did not find 'fileId' in the body.",
    });
  }

  return fileId;
}

function isProcNotFoundError(err, res) {
  if (err instanceof ProcessNotFoundError) {
    res.status(400).send({
      success: false,
      error: err.message,
    });
    return true;
  }
  return false;
}

function isProcExecutedError(err, res) {
  if (err instanceof ProcessExecutedError) {
    res.status(400).send({
      success: false,
      error: err.message,
    });
    return true;
  }
  return false;
}

function isProcNotRunningError(err, res) {
  if (err instanceof ProcessNotRunningError) {
    res.status(400).send({
      success: false,
      error: err.message,
    });
    return true;
  }
  return false;
}

function isProcNotCompletedError(err, res) {
  if (err instanceof ProcessNotCompletedError) {
    res.status(400).send({
      success: false,
      error: err.message,
    });
    return true;
  }
  return false;
}

function internalError(err, res) {
  console.log(err);
  return res.status(500).send({
    status: false,
    message:
      "An internal error occurred. Please try again or contact system admin.",
  });
}
