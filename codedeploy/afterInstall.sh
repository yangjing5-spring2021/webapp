#!/bin/bash
cd /home/ubuntu
sudo chown -R ubuntu:ubuntu webapp
cd webapp
echo "npm install start"
sudo npm install
