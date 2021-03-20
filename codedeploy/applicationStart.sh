#!/bin/bash
echo "application start"
# crontab -l | { cat; echo "@reboot pm2 start /home/ubuntu/webapp/server.js -i 0 --name \"web-app\""; } | crontab -
# sudo pm2 stop web-app
# actually start the server
# sudo pm2 start /home/ubuntu/webapp/server.js -i 0 --name "web-app"
cd /home/ubuntu/webapp
sudo source /etc/profile
# sudo nohup node server.js > /dev/null 2> /dev/null < /dev/null &
sudo forever start server.js
echo "app started"
