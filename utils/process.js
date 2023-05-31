const sleep = (delay, resolveValue) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(resolveValue), delay);
  });

const { INITIALISED, RUNNING, COMPLETED } = require("./stateConstants.js");

const {
  ExceededProcessesLimitError,
  ProcessNotFoundError,
  ProcessExecutedError,
  ProcessNotCompletedError,
  ProcessNotRunningError,
} = require("./processErrors.js");

const fs = require("fs");

const UserData = [
  {
    id: 1,

    year: 2016,

    userGain: 80000,

    userLost: 823,
  },

  {
    id: 6,

    year: 2016,

    userGain: 80000,

    userLost: 823,
  },

  {
    id: 2,

    year: 2017,

    userGain: 45677,

    userLost: 345,
  },

  {
    id: 3,

    year: 2018,

    userGain: 78888,

    userLost: 555,
  },

  {
    id: 4,

    year: 2019,

    userGain: 90000,

    userLost: 4555,
  },

  {
    id: 5,

    year: 2020,

    userGain: 4300,

    userLost: 234,
  },
];

class ProcessesHandler {
  constructor(maxProc = 1, procTimeOut = null) {
    this.maxProc = maxProc;
    this.procTimeOut = procTimeOut;
    this.procs = {};
  }

  addProcess(id, filename) {
    if (Object.keys(this.procs).length >= this.maxProc) {
      throw new ExceededProcessesLimitError(
        Object.keys(this.procs).length,
        this.maxProc
      );
    }

    let proc = new ProcessRunner(id, filename);
    this.procs[id] = proc;
    return true;
  }

  startExecution(id, time = undefined, frequency = undefined) {
    this.procExists(id);
    this.procInitialised(id);

    this.procs[id].startProcess(time, frequency);
    return true;
  }

  getProgress(id) {
    this.procExists(id);
    this.procRunning(id);

    return this.procs[id].getProgress();
  }

  viewResults(id) {
    this.procExists(id);
    this.procCompleted(id);

    let response = {};
    response["Headers"] = [
      "id",
      "year",
      "userGain",
      "userLost"
    ];
    response["data"] = UserData;
    
    return response;
  }

  getResult(id) {
    this.procExists(id);
    this.procCompleted(id);

    let result = this.procs[id].getResult();

    delete this.procs[id];

    return result;
  }

  procExists(id) {
    if (!Object.keys(this.procs).includes(id)) {
      throw new ProcessNotFoundError(id);
    }
    return true;
  }

  procInitialised(id) {
    if (this.procs[id].state !== INITIALISED) {
      throw new ProcessExecutedError(id);
    }
    return true;
  }

  procCompleted(id) {
    if (this.procs[id].state !== COMPLETED) {
      throw new ProcessNotCompletedError(id, this.procs[id].state);
    }
    return true;
  }

  procRunning(id) {
    if (this.procs[id].state !== RUNNING) {
      throw new ProcessNotRunningError(id, this.procs[id].state);
    }
    return true;
  }
}

class ProcessRunner {
  constructor(id, filename) {
    this.id = id;
    this.filename = filename;

    this.initTime = Date.now();
    this.startTime = null;
    this.endTime = null;

    this.state = INITIALISED;
    this.result = null;

    this.maxCount = null;
    this.counter = 0;
  }

  async startProcess(time = 10, frequency = 10) {
    this.maxCount = time * frequency;

    this.state = RUNNING;
    this.startTime = Date.now();

    let waitTime = 1000 / frequency;
    while (this.counter < this.maxCount) {
      await sleep(Math.floor(waitTime));
      this.counter++;
    }

    this.endTime = Date.now();
    this.result = this.id;
    this.state = COMPLETED;
  }

  getProgress() {
    return Math.floor((this.counter / this.maxCount) * 100);
  }

  getResult() {
    return this.result;
  }
}

module.exports = { ProcessesHandler };
