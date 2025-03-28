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
 
//  create a group of documents by icao, getting the min and max timestamp from the group
 group_by_timewindow = {
    $group: {
        _id: "$icao", 
        time_in: {
            $min: "$timestamp",
        },
        time_out: {
            $max: "$timestamp",
        }
    }
}
 
// performs a full left join on the documents in the flights collection with the documents in the callsigns collection
// localField is the stream field, foreign field is what's being lookedup from
let add_callsign = {
    "$lookup": {
      "from": {
        "connectionName": "cluster0",
        "db": "flights",
        "coll": "callsigns"
      },
      "localField": "_id",
      "foreignField": "icao",
      "as": "callsign_info"
    }
};

// Sort the callsign_info array by time_out in descending order so I can get the most recent callsign in the collection
let sort_callsigns = {
    $addFields: {
        "callsign_info": {
            $sortArray: {
                input: "$callsign_info",
                sortBy: { "time_out": -1 }
            }
        }
    }
};

// formats the records as I wanted
let project_fields = {
    "$project": {
      "_id": 1,
      "flights": [
        {
          "time_in": "$time_in",
          "time_out": "$time_out",
          "callsign": { "$arrayElemAt": ["$callsign_info.flight", 0] }
        }
      ],
      flight_count: { $literal: 1 }
    }
  };

// closes the window after 2 minutes of no records
let session_window = { $sessionWindow: {
    partitionBy: "$icao",
    gap: { unit: "minute", size: 2},
    pipeline: [
        group_by_timewindow,
        add_callsign, 
        project_fields
    ]
 }}


let merge_to_flights = {
    $merge: {
        into: {
            connectionName: "cluster0",
            db: "flights",
            coll: "flights"
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

createOrReplaceStreamProcessor("flightTrackingViaLookup", final_pipeline);
