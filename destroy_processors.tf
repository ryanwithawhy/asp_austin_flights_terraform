# Create script to destroy stream processors
resource "local_file" "destroy_processors_script" {
  content = <<-EOT
    // Destroy stream processors
    print("Destroying stream processors...");
    ${join("\n    ", [
      for name in var.stream_processor_names : 
      "try { sp.${name}.drop(); print(\"Destroyed ${name}\"); } catch (e) { print(\"Error destroying ${name}: \" + e); }"
    ])}
  EOT
  filename = "${path.module}/temp/destroy_processors.mongodb.js"
}

# Execute the destroy script
resource "null_resource" "destroy_stream_processors" {
  provisioner "local-exec" {
    command = "${local.mongodb_base_command} --file ${local_file.destroy_processors_script.filename}"
  }
}