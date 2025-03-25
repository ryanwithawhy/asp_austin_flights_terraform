// input: the stream processor object, e.g. sp.streamProcessorName
// output: none
function safeStop(spDotStreamProcessorName) {
    try {
        spDotStreamProcessorName.stop();
    } catch (e) {
        if (e.codeName === "CommandFailed" && e.message.includes("stream processor has already been stopped")) {
            console.log("Stream processor has already been stopped. Skipping stop.");
        } else if (e.codeName === "CommandFailed" && e.message.includes("stream processor doesn't exist")) {
            console.log("Stream processor does not exist. Skipping stop.");
        } else {
            throw e; // Re-throw unexpected errors
        }
    }
}

// input: the stream processor object, e.g. sp.streamProcessorName
// output: none
function dropIfExists(spDotStreamProcessorName) {
   try {
       spDotStreamProcessorName.drop();
   } catch (e) {
       if (e.codeName === "CommandFailed" && e.message.includes("stream processor doesn't exist")) {
       console.log("Stream processor does not exist. Skipping drop.");
       } else {
       throw e; // Re-throw unexpected errors
       }
   }
}

// input: the stream processor name as a string, e.g. "streamProcessorName"
// input: the pipeline as an array of objects, e.g. [source, group_by_timewindow, merge_to_flights]
// output: none
function createStreamProcessorIfNotExists(streamProcessorName, pipeline) {
   try{
       sp.createStreamProcessor(streamProcessorName, pipeline);
   } catch (e) {
       if (e.codeName === "CommandFailed" && e.message.includes("duplicate stream processor name")) {
         console.log("Stream processor already exists. Skipping creation.");
       } else {
         throw e; // Re-throw unexpected errors
       }
   }
}

// input: the stream processor name as a string, e.g. "streamProcessorName"
// input: the pipeline as an array of objects, e.g. [source, group_by_timewindow, merge_to_flights]
// output: none
function createOrReplaceStreamProcessor(streamProcessorName, pipeline) {
   try{
       sp.createStreamProcessor(streamProcessorName, pipeline);
   } catch (e) {
       if (e.codeName === "CommandFailed" && e.message.includes("duplicate stream processor name")) {
         console.log("Stream processor already exists.  Recreating stream processor.");
         sp[streamProcessorName].drop();
         sp.createStreamProcessor(streamProcessorName, pipeline);
       } else {
         throw e; // Re-throw unexpected errors
       }
   }
}

let source = {
   $source: {
      connectionName: "flights",
      "topic": "airplanes"
   }
};

let message_1_only = {
   $match: {
      "msg_type": "1"
   }
}

let icao_and_callsign_only = {
    $project: {
        icao: 1,
        flight: 1,
        timestamp: 1
    }
}

let merge_callsign_records = {
    $merge: {
        into: {
           connectionName: "cluster0",
           db: "flights",
           coll: "callsigns"
        }
     }
};

createOrReplaceStreamProcessor("callsignRecords", [source, message_1_only, icao_and_callsign_only, merge_callsign_records])