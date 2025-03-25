# Run MongoDB scripts to create stream processors
resource "null_resource" "create_stream_processors" {
  count = length(var.create_stream_processor_files)

  provisioner "local-exec" {
    command = "${local.mongodb_base_command} --file ${var.create_stream_processor_files[count.index]}"
  }
}