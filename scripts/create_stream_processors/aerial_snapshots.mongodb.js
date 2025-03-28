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

// Define the source stream - in this case, a Kafka topic named "airplanes" from a connection called "flights"
let source = {
    $source: {
        connectionName: "flights",
        "topic": "airplanes"
    }
};

// Filter to only include messages where the msg_type field is '3'
// This might indicate a specific type of message relevant for tracking
let only_message_type_3 = {
    $match: {
        msg_type: '3'
    }
};

// Project (i.e., keep) only the fields that are relevant for flight tracking
let fields_i_care_about = {
    $project: {
        icao: 1,        // aircraft identifier
        lat: 1,         // latitude
        lon: 1,         // longitude
        altitude: 1,    // altitude
        timestamp: 1    // timestamp of the message
    }
};

// Sort the messages in reverse chronological order (latest first) by timestamp
let sorted_flights = {
    $sort: { "timestamp": -1 }
};

// Group by aircraft (icao), and take only the first (i.e., latest due to sort) message per aircraft
let latest_flight_per_icao = {
    $group: {
        _id: "$icao",
        latestFlight: { $first: "$$ROOT" } // $$ROOT is the full original document
    }
};

// Group all the latest flights into a single document with a `flights` array
let collect_array = {
    $group: {
        _id: null, // no grouping key; this is a catch-all group
        flights: { $push: "$latestFlight" } // push all latest flights into an array
    }
};

// This is the pipeline that will be run inside the hopping window
// It processes the stream data to extract the latest message per aircraft every window hop
pre_hop_pipeline = [
    only_message_type_3,
    fields_i_care_about,
    sorted_flights,
    latest_flight_per_icao,
    collect_array
];

// Apply a hopping window to the stream
// Every 15 seconds, the system will look at the last 60 seconds of data and apply `pre_hop_pipeline` to it
let hopping_window = {
    $hoppingWindow: {
        boundary: "eventTime", // use eventTime field for window alignment
        interval: {
            size: 60,
            unit: "second"
        },
        hopSize: {
            size: 15,
            unit: "second"
        },
        offset: {
            offsetFromUtc: 60,
            unit: "second"
        },
        // startTime: ISODate("1970-01-01T00:00:00Z"),  // aligns to 00, 15, 30, 45,
        pipeline: pre_hop_pipeline // the logic to apply within each window
    }
};


let add_end_time = {
    $addFields: {
        windowEndTime: { $meta: "stream.window.end" }
    }
}

let final_version = {
    $project: {
        _id: "$windowEndTime",
        flights: 1
    }
};

let merge_flight_snapshots = {
    $merge: {
        into: {
            connectionName: "cluster0",
            db: "flights",
            coll: "flight_snapshots"
        },
        whenMatched: "replace",
        whenNotMatched: "insert"
    }
};

createOrReplaceStreamProcessor("aerialSnapshots", [source, hopping_window, add_end_time, final_version, merge_flight_snapshots]);