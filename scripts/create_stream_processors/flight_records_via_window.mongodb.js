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

safeStop(sp.flightTrackingWithFirstCallsign);
dropIfExists(sp.flightTrackingWithFirstCallsign);

// source is a kafka stream called airplanes
let source = {
    $source: {
       connectionName: "flights",
       "topic": "airplanes"
    }
 };
 
//  create a group of documents by icao, getting the min and max timestamp from the group
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

let project_fields = {
    "$project": {
      "_id": 1,
      "flights": [
        {
          "time_in": "$time_in",
          "time_out": "$time_out",
          "callsign": "$callsign"
        }
      ],
      flight_count: { $literal: 1 }
    }
  };

let session_window = { $sessionWindow: {
    partitionBy: "$icao",
    gap: { unit: "minute", size: 2},
    pipeline: [
        group_by_timewindow,
        project_fields
    ]
 }};


let merge_to_flights = {
    $merge: {
        into: {
            connectionName: "cluster0",
            db: "flights",
            coll: "flights_v3"
        },
        whenMatched: [
            {
                $addFields: {
                    flights: { $concatArrays: ["$flights", "$$new.flights"] },
                    flight_count: { $add: ["$flight_count", 1] }
                }
            }
        ],
        whenNotMatched: "insert"
    }
};

// Complete pipeline
let final_pipeline = [
    source, 
    session_window, 
    merge_to_flights
];

createOrReplaceStreamProcessor("flightRecordsViaWindow", final_pipeline);
