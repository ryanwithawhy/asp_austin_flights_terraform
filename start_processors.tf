# Create script to start stream processors
resource "local_file" "start_processors_script" {
  content = <<-EOT
    // Start stream processors
    print("Starting stream processors...");
    ${join("\n    ", [
      for name in var.stream_processor_names : 
      "try { sp.${name}.start(); print(\"Started ${name}\"); } catch (e) { print(\"Error starting ${name}: \" + e); }"
    ])}
  EOT
  filename = "${path.module}/start_processors.mongodb.js"
}

resource "null_resource" "start_stream_processors" {
  depends_on = [null_resource.create_stream_processors]
  
  triggers = {
    # Force this to run every time
    time = timestamp()
  }

  provisioner "local-exec" {
    command = "${local.mongodb_base_command} --file ${local_file.start_processors_script.filename}"
  }
}