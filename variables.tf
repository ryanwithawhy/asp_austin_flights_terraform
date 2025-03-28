# MongoDB connection variables
variable "mongodb_host" {
  description = "MongoDB host address"
  type        = string
}

variable "mongodb_username" {
  description = "MongoDB username"
  type        = string
  sensitive   = true
}

variable "mongodb_password" {
  description = "MongoDB password"
  type        = string
  sensitive   = true
}

variable "mongodb_auth_database" {
  description = "MongoDB authentication database"
  type        = string
  default     = "admin"
}

variable "mongodb_tls" {
  description = "Use TLS for MongoDB connection"
  type        = bool
  default     = true
}

# Stream processor variables
variable "create_stream_processor_files" {
  description = "MongoDB JS files that define stream processors"
  type        = list(string)
  default     = [
    "scripts/create_stream_processors/callsign_records.mongodb.js",
    "scripts/create_stream_processors/flight_records_via_lookup.mongodb.js",
    "scripts/create_stream_processors/flight_records_via_window.mongodb.js",
    "scripts/create_stream_processors/delete_call_signs.mongodb.js",
    "scripts/create_stream_processors/aerial_snapshots.mongodb.js"
  ]
}

variable "stream_processor_names" {
  description = "Names of stream processors to manage"
  type        = list(string)
  default     = [
    "callsignRecords",
    "flightTrackingViaLookup",
    "flightRecordsViaWindow",
    "deleteCallSigns",
    "aerialSnapshots"
  ]
}

locals {
    mongodb_base_command = "mongosh \"${var.mongodb_host}\" ${var.mongodb_tls ? "--tls" : ""} --username ${var.mongodb_username} --password ${var.mongodb_password} --authenticationDatabase ${var.mongodb_auth_database}"
}