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

// source is a kafka stream called airplanes
let source = {
    $source: {
       connectionName: "flights",
       "topic": "airplanes"
    }
 };
 
// create a group of documents by icao, getting the min and max timestamp from the group
// if the flight was included in a message during this window, it will be reported here
 let group_by_timewindow = {
    $group: {
        _id: "$icao", 
        time_in: {
            $min: "$timestamp",
        },
        time_out: {
            $max: "$timestamp",
        },
        callsign: {
            $last: "$flight"
        }
    }
};



// the sesion window allows this by closing the session and sending the records
// as soon as there are no records for the specified gap time
let session_window = { $sessionWindow: {
    partitionBy: "$icao",
    gap: { unit: "second", size: 10},
    pipeline: [
        group_by_timewindow
    ]
 }};

 let convert_to_snowflake_datetime_format = {
    $project: {
        icao: "$_id",
        time_in: {
            $dateToString: {
                format: "%Y-%m-%d %H:%M:%S",
                date: {
                    $toDate: {
                        $multiply: ["$time_in", 1000]  // Convert seconds to milliseconds
                    }
                }
            }
        },
        time_out: {
            $dateToString: {
                format: "%Y-%m-%d %H:%M:%S",
                date: {
                    $toDate: {
                        $multiply: ["$time_out", 1000]  // Convert seconds to milliseconds
                    }
                }
            }
        },
        callsign: "$callsign"
    }
}

let emit_to_confluent = {
    $emit: {
        connectionName: "confluent-2",
        topic: "test_topic",
    }
};

// Complete pipeline
let final_pipeline = [
    source, 
    session_window, 
    convert_to_snowflake_datetime_format,
    // emit_to_confluent
];

sp.process(final_pipeline)

// createOrReplaceStreamProcessor("flightWindowsForDW", final_pipeline);
