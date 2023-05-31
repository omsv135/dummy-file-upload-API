const { INITIALISED, RUNNING, COMPLETED } = require("./stateConstants.js");

function ExceededProcessesLimitError(num, limit){
  this.name = "ExceededProcessesLimitException";
  this.message = `The number of processes has been exceeded. (${num}/${limit} running)`;
  this.toString = function (){
    return String(this.message);
  };
}

function ProcessNotFoundError(id){
  this.name = "ProcessNotFound";
  this.message = `The process with id '${id}' was not found.`;
  this.toString = function (){
    return String(this.message);
  };
}

function ProcessExecutedError(id){
  this.name = "ProcessExecutedError";
  this.message = `The process with id '${id}' has already been executed and might already be completed.`;
  this.toString = function (){
    return String(this.message);
  };
}

function ProcessNotCompletedError(id, cur_state){
  this.name = "ProcessNotCompleted";
  this.message = `The process with id '${id}' `;
  if (cur_state === INITIALISED){
    this.message = this.message + "has not started execution.";
  } else if (cur_state === RUNNING){
    this.message = this.message + "has not been completed and is running.";
  } else {
    this.message = this.message + "has not been completed.";
  }
  
  this.toString = function (){
    return String(this.message);
  };
}

function ProcessNotRunningError(id, cur_state){
  this.name = "ProcessNotRunning";
  this.message = `The process with id '${id}' `;
  if (cur_state === INITIALISED){
    this.message = this.message + "has not started execution.";
  } else if (cur_state === COMPLETED){
    this.message = this.message + "has been completed.";
  } else {
    this.message = this.message + "is not running.";
  }
  
  this.toString = function (){
    return String(this.message);
  };
}

module.exports = {
  ExceededProcessesLimitError,
  ProcessNotFoundError,
  ProcessExecutedError,
  ProcessNotCompletedError,
  ProcessNotRunningError
}
