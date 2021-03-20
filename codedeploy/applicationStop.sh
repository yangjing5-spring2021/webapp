#!/bin/bash
# sudo pm2 stop web-app
# sudo pkill node
cd /home/ubuntu/webapp
sudo forever stop server.js
cd ..
sudo rm -rf /home/ubuntu/webapp

