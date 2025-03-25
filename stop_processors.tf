# Create script to stop stream processors
resource "local_file" "stop_processors_script" {
  content = <<-EOT
    // Stop stream processors
    print("Stopping stream processors...");
    ${join("\n    ", [
      for name in var.stream_processor_names : 
      "try { sp.${name}.stop(); print(\"Stopped ${name}\"); } catch (e) { print(\"Error stopping ${name}: \" + e); }"
    ])}
  EOT
  filename = "${path.module}/temp/stop_processors.mongodb.js"
}

# Execute the stop script
resource "null_resource" "stop_stream_processors" {
  provisioner "local-exec" {
    command = "${local.mongodb_base_command} --file ${local_file.stop_processors_script.filename}"
  }
}