const { MongoClient, ObjectId } = require('mongodb');

// Update these with your MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI; 

let cachedDb = null;

// Function to connect to the database
async function connectToDatabase(db_name) {
  if (cachedDb) {
    return cachedDb;
  }
  
  const client = await MongoClient.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 45000,
    connectTimeoutMS: 45000,
    socketTimeoutMS: 45000
  });
  
  const db = client.db(db_name);
  
  cachedDb = db;
  return cachedDb;
}

async function getOperationType(event) {
    return event["operationType"];
}

async function getEventData(event) {
    icao = event["documentKey"]["_id"];
    operation_type = await getOperationType(event);
    console.log("operation type: ", operation_type)
    if(operation_type == "update"){
        updatedFields = event["updateDescription"]["updatedFields"]
        flight_count = updatedFields["flight_count"];
        array_position = flight_count - 1;
        field_name = `flights.${array_position}`;
        callsign = updatedFields[field_name]["callsign"]
    } else if (operation_type == "insert"){
        callsign = event["fullDocument"]["flights"][0]["callsign"]
    } else {
        console.log("wow, this is unexpected");
        return {}
    }
    return {
        icao: icao,
        flight: callsign
    }
}

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    
    operation_type = event["operationType"]

    console.log("received event: ", JSON.stringify(event, null, 2));
    console.log("received context: ", JSON.stringify(context, null, 2));

    try {
      // Connect to the database
      const db = await connectToDatabase("flights");
      const collection = db.collection("callsigns");
      
      // The event is already an array of records thanks to Lambda batching
      const records = Array.isArray(event.Records) ? event.Records : [event];
      console.log(`Processing batch of ${records.length} records`);
      
      let results = [];
      
      // Process each record in the batch provided by Lambda
      for (const record of records) {
        // Extract the _id from the CDC event structure
        info = await getEventData(record);
        
        if (info == {}){
          console.warn('Record missing', record);
          continue;
        }
        console.log(info)
        // Delete the document
        const result = await collection.deleteMany({ icao: info.icao, flight: info.flight });
        results.push({ info, deletedCount: result.deletedCount });
      }
      
      return { 
        results: results,
        batchItemFailures: [] // Return any failed items if using partial batch responses
      };
      
    } catch (error) {
      console.error('Error processing batch:', error);
      throw error; // Let Lambda handle the retry policy
    }
  }