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

let flights_collection_change_stream = {
    $source: {
       connectionName: "flights_db",
       "db": "flights",
       "coll": "flights",
    }
 };

 let delete_https_request = {
    $externalFunction: {
        "connectionName": "delete_callsign",
        "as": "what_does_this_do?",
        "functionName": "arn:aws:lambda:us-east-1:539247470886:function:delete_callsigns_after_insert"
    }
 }

pipeline = [flights_collection_change_stream, delete_https_request];
// use flights;

// console.log(db.flights.findOne());

// db.flights.deleteOne({ "$flight": "LXJ455" });

createOrReplaceStreamProcessor("deleteCallSigns", pipeline);
// 