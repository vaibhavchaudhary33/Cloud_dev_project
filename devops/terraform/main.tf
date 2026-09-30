terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "eu-north-1"
}

variable "ssh_cidr" {
  description = "Your public IP in CIDR form, e.g. 203.0.113.7/32 (do NOT use 0.0.0.0/0)"
  type        = string
}

variable "key_name" {
  description = "Name of an existing EC2 key pair"
  type        = string
  default     = "clouddev-key"
}

variable "instance_type" {
  type    = string
  default = "m7i-flex.large" # 2 vCPU / 8 GiB: enough for Minikube + monitoring
}

# Latest Ubuntu 24.04 (Ansible playbook uses apt, so the OS must be Ubuntu)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_security_group" "clouddev" {
  name        = "clouddev-sg"
  description = "CloudDev access"

  ingress {
    description = "SSH (your IP only)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }
  ingress {
    description = "Frontend"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Backend / NodePort"
    from_port   = 30007
    to_port     = 30007
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Intra-group (pod-to-pod)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "clouddev" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.clouddev.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = { Name = "clouddev-server" }
}

output "public_ip" {
  value = aws_instance.clouddev.public_ip
}
