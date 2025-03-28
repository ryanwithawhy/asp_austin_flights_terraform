let flights_collection_change_stream = {
    $source: {
       connectionName: "flights_db",
       "db": "flights",
       "coll": "callsigns",
    }
 };

 let deletes_only = {
     $match: {
         "operationType": "delete"
     }
 };


sp.process([flights_collection_change_stream, deletes_only]);