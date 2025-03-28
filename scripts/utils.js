// streamHelpers.js

function safeStop(spDotStreamProcessorName) {
    try {
        spDotStreamProcessorName.stop();
    } catch (e) {
        if (e.codeName === "CommandFailed" && e.message.includes("stream processor has already been stopped")) {
            console.log("Stream processor has already been stopped. Skipping stop.");
        } else if (e.codeName === "CommandFailed" && e.message.includes("stream processor doesn't exist")) {
            console.log("Stream processor does not exist. Skipping stop.");
        } else {
            throw e;
        }
    }
}

function dropIfExists(spDotStreamProcessorName) {
    try {
        spDotStreamProcessorName.drop();
    } catch (e) {
        if (e.codeName === "CommandFailed" && e.message.includes("stream processor doesn't exist")) {
            console.log("Stream processor does not exist. Skipping drop.");
        } else {
            throw e;
        }
    }
}

function createStreamProcessorIfNotExists(streamProcessorName, pipeline) {
    try {
        sp.createStreamProcessor(streamProcessorName, pipeline);
    } catch (e) {
        if (e.codeName === "CommandFailed" && e.message.includes("duplicate stream processor name")) {
            console.log("Stream processor already exists. Skipping creation.");
        } else {
            throw e;
        }
    }
}

function createOrReplaceStreamProcessor(streamProcessorName, pipeline) {
    try {
        sp.createStreamProcessor(streamProcessorName, pipeline);
    } catch (e) {
        if (e.codeName === "CommandFailed" && e.message.includes("duplicate stream processor name")) {
            console.log("Stream processor already exists. Recreating stream processor.");
            sp[streamProcessorName].drop();
            sp.createStreamProcessor(streamProcessorName, pipeline);
        } else {
            throw e;
        }
    }
}

module.exports = {
    safeStop,
    dropIfExists,
    createStreamProcessorIfNotExists,
    createOrReplaceStreamProcessor
};
