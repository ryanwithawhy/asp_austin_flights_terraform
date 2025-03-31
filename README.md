# MongoDB Stream Processor Terraform Configuration

This Terraform configuration helps you deploy and start MongoDB stream processors from JavaScript files.

## Prerequisites

1. [Terraform](https://www.terraform.io/downloads.html) installed (v1.0.0+)
2. [MongoDB Shell (mongosh)](https://www.mongodb.com/try/download/shell) installed
3. Access to a MongoDB instance with the necessary permissions
4. Access to the Kafka stream of flight data

## Usage

1. Update the `terraform.tfvars` file with your MongoDB connection details:

```hcl
mongodb_host        = "your-mongodb-host.example.com"
mongodb_port        = 27017
mongodb_username    = "your-username"
mongodb_password    = "your-password"
mongodb_auth_database = "admin"
```

2. Initialize Terraform:

```bash
terraform init
```

3. Preview the changes that Terraform will make:

```bash
terraform plan
```

4. Apply the Terraform configuration to run the MongoDB scripts and start the stream processors:

```bash
terraform apply
```

5. When prompted, type `yes` to confirm the apply.

## What This Does

1. Executes each of your MongoDB scripts in sequence
2. Creates and runs a final script that starts all of your stream processors
3. Allows you to stop and destroy the stream processors

## Security Considerations

- The `terraform.tfvars` file contains sensitive information and should not be committed to version control
- Consider using environment variables or a secrets manager for MongoDB credentials in production environments

## How to Run
```sh
# create or replace stream processors
terraform apply -target=null_resource.create_stream_processors -var-file=terraform.tfvars \
    -replace="null_resource.create_stream_processors[0]" \
    -replace="null_resource.create_stream_processors[1]" \
    -replace="null_resource.create_stream_processors[2]" \
    -replace="null_resource.create_stream_processors[3]" \
    -replace="null_resource.create_stream_processors[4]" 

#start_stream_processors
terraform apply -target=null_resource.start_stream_processors -var-file=terraform.tfvars -replace="null_resource.start_stream_processors"

#stop_stream_processors
terraform apply -target=null_resource.stop_stream_processors -var-file=terraform.tfvars -replace="null_resource.stop_stream_processors"

#destroy stream processors
terraform apply -target=null_resource.destroy_stream_processors -var-file=terraform.tfvars -replace="null_resource.destroy_stream_processors"
```

