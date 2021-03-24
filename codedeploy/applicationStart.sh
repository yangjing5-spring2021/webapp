#!/bin/bash
echo "application start"
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/home/ubuntu/webapp/cloudwatch-config.json \
    -s
cd /home/ubuntu/webapp
cp /home/ubuntu/.env /home/ubuntu/webapp/.env
# sudo nohup node server.js > /dev/null 2> /dev/null < /dev/null &
sudo forever start server.js
echo "app started"
